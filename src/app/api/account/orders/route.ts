import { NextResponse } from 'next/server';
import { hasDatabase, prisma } from '@/lib/prisma';
import { getCustomerId } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/account/orders — the signed-in customer's order history.
 *
 * Scoped by the session's customer id, never by anything the client sends, so
 * one shopper cannot read another's orders by guessing an id.
 */
export async function GET() {
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'Accounts require a database' }, { status: 503 });
  }

  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ orders });
}
