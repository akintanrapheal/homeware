import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/customer-auth';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().trim().min(10).max(200),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

/** POST /api/account/password/reset — spend a token, set a new password. */
export async function POST(request: Request) {
  const limit = await rateLimit('password-reset', identify(request), 10, 900);
  if (!limit.ok) return tooManyRequests(limit);

  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'Accounts require a database' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  const invalid = NextResponse.json(
    { error: 'That reset link has expired or already been used. Please request a new one.' },
    { status: 400 },
  );

  if (!record || record.usedAt || record.expiresAt <= new Date()) return invalid;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: record.customerId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Any other outstanding links for this account are void now.
    prisma.passwordResetToken.updateMany({
      where: { customerId: record.customerId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: 'Your password has been changed. You can sign in now.' });
}
