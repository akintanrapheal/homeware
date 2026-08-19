import { NextResponse } from 'next/server';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/paystack/verify?reference=MLS-XXXXXX
 *
 * Called by the confirmation page when Paystack redirects back. The webhook is
 * the authoritative signal, but customers land here first — verifying directly
 * means the page shows "paid" immediately instead of waiting on the callback.
 */
export async function GET(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const reference = new URL(request.url).searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'reference is required' }, { status: 400 });
  }
  if (!secret) {
    return NextResponse.json({ error: 'Paystack is not configured' }, { status: 503 });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' },
    );
    const data = await response.json();

    if (!response.ok || !data?.status) {
      return NextResponse.json(
        { error: data?.message ?? 'Could not verify payment' },
        { status: 502 },
      );
    }

    const paid = data.data?.status === 'success';

    if (paid && hasDatabase && prisma) {
      await prisma.order.updateMany({
        where: { reference, status: { not: 'PAID' } },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    return NextResponse.json({
      paid,
      status: data.data?.status,
      amount: typeof data.data?.amount === 'number' ? data.data.amount / 100 : null,
      reference,
    });
  } catch (error) {
    console.error('[paystack] verify error', error);
    return NextResponse.json({ error: 'Could not reach Paystack' }, { status: 502 });
  }
}
