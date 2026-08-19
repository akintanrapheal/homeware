import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { STORE } from '@/lib/config';

export const dynamic = 'force-dynamic';

const schema = z.object({
  reference: z.string().trim().min(4).max(64),
});

/**
 * POST /api/paystack/init — start a transaction for an existing order.
 *
 * The amount comes from the stored order, never from the browser, and Paystack
 * is given our own reference so the webhook can match the payment back to it.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'Card payment is not configured yet. Please order on WhatsApp.' },
      { status: 503 },
    );
  }

  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      { error: 'Card payment requires a database connection.' },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid order reference is required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { reference: parsed.data.reference } });
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.status === 'PAID') {
    return NextResponse.json({ error: 'This order is already paid' }, { status: 409 });
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: order.email,
        amount: order.total * 100, // Paystack works in kobo
        currency: 'NGN',
        reference: order.reference,
        callback_url: `${STORE.url}/order/${order.reference}`,
        metadata: {
          order_reference: order.reference,
          customer_name: order.customerName,
          phone: order.phone,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.status) {
      console.error('[paystack] init failed', data);
      return NextResponse.json(
        { error: data?.message ?? 'Could not start payment' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('[paystack] init error', error);
    return NextResponse.json({ error: 'Could not reach Paystack' }, { status: 502 });
  }
}
