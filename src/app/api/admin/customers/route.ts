import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
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
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const search = new URL(request.url).searchParams.get('q')?.trim();

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
      orders: {
        select: { id: true, total: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const rows = customers
    .map((c) => {
      const paid = c.orders.filter((o) =>
        (EARNING_STATUSES as readonly string[]).includes(o.status),
      );
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        createdAt: c.createdAt,
        orderCount: c.orders.length,
        paidOrderCount: paid.length,
        lifetimeValue: paid.reduce((sum, o) => sum + o.total, 0),
        lastOrderAt: c.orders.reduce<Date | null>(
          (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
          null,
        ),
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
