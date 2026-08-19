import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/paystack/webhook
 *
 * Paystack signs every event with HMAC-SHA512 over the raw body using the
 * secret key. We must read the body as text (not JSON) so the bytes we hash are
 * exactly the bytes they signed.
 *
 * Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://your-domain.com/api/paystack/webhook
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get('x-paystack-signature') ?? '';
  const expected = createHmac('sha512', secret).update(raw).digest('hex');

  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const reference = event.data?.reference;

  if (event.event === 'charge.success' && reference && hasDatabase && prisma) {
    try {
      await prisma.order.updateMany({
        where: { reference, status: { not: 'PAID' } },
        data: { status: 'PAID', paidAt: new Date() },
      });
    } catch (error) {
      // Never 500 back at Paystack — that triggers their retry storm. Log and
      // acknowledge; the verify endpoint is the safety net.
      console.error('[paystack] webhook update failed', error);
    }
  }

  return NextResponse.json({ received: true });
}
