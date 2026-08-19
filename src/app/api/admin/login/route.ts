import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_MAX_AGE, checkPassword, createSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Admin access is not configured. Set ADMIN_PASSWORD in your environment.' },
      { status: 503 },
    );
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!checkPassword(password)) {
    // Blunt throttle: a wrong password costs a second, which makes online
    // guessing impractical without needing a rate-limit store.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
