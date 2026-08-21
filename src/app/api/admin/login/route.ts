import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  checkBootstrapSecret,
  createSessionToken,
  hashPassword,
  needsBootstrap,
  verifyPassword,
} from '@/lib/admin-auth';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z.string().min(1, 'Enter your password').max(200),
});

const bootstrapSchema = z.object({
  bootstrap: z.literal(true),
  secret: z.string().min(1),
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

function sessionResponse(body: object, adminUserId: string) {
  const response = NextResponse.json(body);
  response.cookies.set(ADMIN_COOKIE, createSessionToken(adminUserId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}

/** GET — whether the very first account still needs creating. */
export async function GET() {
  return NextResponse.json({ needsBootstrap: await needsBootstrap() });
}

export async function POST(request: Request) {
  const byIp = await rateLimit('admin-login', identify(request), 10, 900);
  if (!byIp.ok) return tooManyRequests(byIp);

  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      { error: 'Staff accounts require a database connection.' },
      { status: 503 },
    );
  }

  const payload = await request.json().catch(() => null);

  /* ---------------------------------------------------------- first account */
  if (payload?.bootstrap === true) {
    if (!(await needsBootstrap())) {
      return NextResponse.json(
        { error: 'An owner account already exists. Sign in instead.' },
        { status: 409 },
      );
    }

    const parsed = bootstrapSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Check the form' },
        { status: 400 },
      );
    }

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Set ADMIN_PASSWORD in your environment first — it authorises creating the owner.' },
        { status: 503 },
      );
    }
    if (!checkBootstrapSecret(parsed.data.secret)) {
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json({ error: 'That setup password is not correct.' }, { status: 401 });
    }

    const owner = await prisma.adminUser.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: 'OWNER',
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await audit('user.create', `Owner account created for ${owner.email}`, { target: owner.id });
    return sessionResponse({ user: owner, created: true }, owner.id);
  }

  /* ---------------------------------------------------------- normal login */
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the form' },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  // Limit per address too, so one account cannot be ground down from a
  // rotating pool of IPs.
  const byEmail = await rateLimit('admin-login-email', email, 6, 900);
  if (!byEmail.ok) {
    return tooManyRequests(byEmail, 'Too many attempts for this account. Please wait a few minutes.');
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });

  // One message for every failure. Distinguishing "no such account" from
  // "wrong password" tells an attacker which addresses are worth attacking,
  // and "your account is suspended" confirms it exists.
  const invalid = NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });

  if (!user) {
    await verifyPassword(password, `${'0'.repeat(32)}:${'0'.repeat(128)}`);
    return invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;
  if (user.suspended) return invalid;

  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return sessionResponse(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    user.id,
  );
}
