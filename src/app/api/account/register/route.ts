import { NextResponse } from 'next/server';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import {
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
  createCustomerToken,
  hashPassword,
} from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
  phone: z.string().trim().max(24).optional().nullable(),
});

export async function POST(request: Request) {
  const limit = await rateLimit('register', identify(request), 5, 900);
  if (!limit.ok) return tooManyRequests(limit);

  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      { error: 'Accounts require a database connection.' },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Please check the form',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password, phone } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with that email already exists. Try signing in.' },
      { status: 409 },
    );
  }

  const customer = await prisma.customer.create({
    data: { name, email, phone: phone || null, passwordHash: await hashPassword(password) },
    select: { id: true, name: true, email: true, phone: true },
  });

  // Registering signs you straight in — an extra login step after signup is
  // friction with no security benefit.
  const response = NextResponse.json({ customer }, { status: 201 });
  response.cookies.set(CUSTOMER_COOKIE, createCustomerToken(customer.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
  return response;
}
