import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import {
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
  createCustomerToken,
  verifyPassword,
} from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z.string().min(1, 'Enter your password').max(200),
});

export async function POST(request: Request) {
  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      { error: 'Accounts require a database connection.' },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form' },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const customer = await prisma.customer.findUnique({ where: { email } });

  // One message for both "no such email" and "wrong password", so the endpoint
  // cannot be used to discover which addresses have accounts.
  const invalid = NextResponse.json(
    { error: 'Incorrect email or password' },
    { status: 401 },
  );

  if (!customer) {
    // Spend comparable time to a real verification so timing does not leak
    // whether the account exists.
    await verifyPassword(password, `${'0'.repeat(32)}:${'0'.repeat(128)}`);
    return invalid;
  }

  if (!(await verifyPassword(password, customer.passwordHash))) return invalid;

  const response = NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
  response.cookies.set(CUSTOMER_COOKIE, createCustomerToken(customer.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
  return response;
}
