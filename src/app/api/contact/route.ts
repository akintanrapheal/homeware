import { NextResponse } from 'next/server';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2, 'Please tell us your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  subject: z.string().trim().min(2, 'Add a subject').max(160),
  body: z.string().trim().min(10, 'Tell us a little more').max(2000),
});

export async function POST(request: Request) {
  const limit = await rateLimit('contact', identify(request), 5, 600);
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
      {
        error: parsed.error.issues[0]?.message ?? 'Please check the form',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (!hasDatabase || !prisma) {
    console.info('[contact] message (not persisted, no DATABASE_URL):', parsed.data);
    return NextResponse.json({ message: 'Message received. We reply within one business day.' });
  }

  try {
    await prisma.message.create({ data: parsed.data });
    return NextResponse.json({ message: 'Message received. We reply within one business day.' });
  } catch (error) {
    console.error('[contact] failed', error);
    return NextResponse.json({ error: 'Could not send your message right now' }, { status: 500 });
  }
}
