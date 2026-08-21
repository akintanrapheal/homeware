import { NextResponse } from 'next/server';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EARNING_STATUSES = ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] as const;

/**
 * GET /api/admin/customers — registered customers with lifetime value.
 *
 * Guest orders have no customerId, so they are reported separately rather than
 * silently dropped: for most Nigerian boutiques guests are the majority of
 * sales, and a customer list that hides them misleads.
 */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'customers.view')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const search = new URL(request.url).searchParams.get('q')?.trim();

  /*
    Aggregate in the database rather than loading every order for every customer
    into memory. The previous version pulled the whole order history back just to
    sum it, which is fine at a hundred customers and ruinous at ten thousand.
  */
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const ids = customers.map((c) => c.id);

  const [paidTotals, lastOrders] = ids.length
    ? await Promise.all([
        prisma.order.groupBy({
          by: ['customerId'],
          where: { customerId: { in: ids }, status: { in: [...EARNING_STATUSES] } },
          _sum: { total: true },
          _count: { _all: true },
        }),
        prisma.order.groupBy({
          by: ['customerId'],
          where: { customerId: { in: ids } },
          _max: { createdAt: true },
        }),
      ])
    : [[], []];

  const paidBy = new Map(paidTotals.map((r) => [r.customerId, r]));
  const lastBy = new Map(lastOrders.map((r) => [r.customerId, r._max.createdAt]));

  const rows = customers
    .map((c) => {
      const paid = paidBy.get(c.id);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        createdAt: c.createdAt,
        orderCount: c._count.orders,
        paidOrderCount: paid?._count._all ?? 0,
        lifetimeValue: paid?._sum.total ?? 0,
        lastOrderAt: lastBy.get(c.id) ?? null,
      };
    })
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);

  const [guestOrders, guestRevenue] = await Promise.all([
    prisma.order.count({ where: { customerId: null } }),
    prisma.order.aggregate({
      where: { customerId: null, status: { in: [...EARNING_STATUSES] } },
      _sum: { total: true },
    }),
  ]);

  return NextResponse.json({
    customers: rows,
    totals: {
      registered: rows.length,
      registeredRevenue: rows.reduce((sum, r) => sum + r.lifetimeValue, 0),
      guestOrders,
      guestRevenue: guestRevenue._sum.total ?? 0,
    },
  });
}
