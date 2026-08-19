import { NextResponse } from 'next/server';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/orders/:reference — order lookup for the confirmation page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
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

  return NextResponse.json({ order });
}
