import { NextResponse } from 'next/server';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/admin/orders?status=&limit= — order list plus headline stats. */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'orders.view')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = Math.min(200, Number(searchParams.get('limit')) || 60);

  const [orders, totals, paidAggregate] = await Promise.all([
    prisma.order.findMany({
      where: status && status !== 'all' ? { status: status as never } : undefined,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { total: true } }),
  ]);

  const counts = totals.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  return NextResponse.json({
    orders,
    stats: {
      counts,
      totalOrders: Object.values(counts).reduce((a, b) => a + b, 0),
      revenuePaid: paidAggregate._sum.total ?? 0,
    },
  });
}
