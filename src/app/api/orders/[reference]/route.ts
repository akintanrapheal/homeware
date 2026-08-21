import { NextResponse } from 'next/server';
import { hasDatabase, prisma } from '@/lib/prisma';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** GET /api/orders/:reference — order lookup for the confirmation page. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  // A reference is six characters from a 32-letter alphabet. That is a large
  // space, but not one worth leaving open to a script — anyone who guesses one
  // reads somebody's order.
  const limit = await rateLimit('order-lookup', identify(request), 20, 300);
  if (!limit.ok) return tooManyRequests(limit);

  const { reference } = await params;

  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      { error: 'Order lookup requires a database connection' },
      { status: 503 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  /*
    Email and phone are deliberately withheld. This endpoint needs no
    authentication — the confirmation page is shown to a guest who has just
    checked out — so anyone holding a reference can call it, and a reference
    travels through WhatsApp messages and screenshots. The page displays the
    name, address and total; it never shows the email or phone, so sending
    them would be handing out contact details for nothing.
  */
  const { email: _email, phone: _phone, ...safe } = order;
  return NextResponse.json({ order: safe });
}
