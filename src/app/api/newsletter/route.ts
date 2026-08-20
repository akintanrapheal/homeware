import { NextResponse } from 'next/server';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
});

export async function POST(request: Request) {
  const limit = await rateLimit('newsletter', identify(request), 5, 300);
  if (!limit.ok) return tooManyRequests(limit);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address' },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  if (!hasDatabase || !prisma) {
    // Nothing to persist to yet — still confirm, so the form works in preview.
    console.info('[newsletter] signup (not persisted, no DATABASE_URL):', email);
    return NextResponse.json({ message: 'You are on the list. Welcome.' });
  }

  try {
    await prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    return NextResponse.json({ message: 'You are on the list. Welcome.' });
  } catch (error) {
    console.error('[newsletter] failed', error);
    return NextResponse.json({ error: 'Could not subscribe right now' }, { status: 500 });
  }
}
