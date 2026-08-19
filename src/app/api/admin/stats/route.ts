import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Revenue counts an order once it is no longer PENDING or CANCELLED — i.e. money
 * actually committed. Counting PENDING would flatter the numbers with orders
 * that may never be paid.
 */
const EARNING_STATUSES = ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] as const;

const LOW_STOCK_THRESHOLD = 5;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const earning = { status: { in: [...EARNING_STATUSES] } };

  const [
    today,
    week,
    month,
    allTime,
    statusGroups,
    lowStock,
    topItems,
    recentOrders,
    customerCount,
    productCount,
    pendingValue,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { ...earning, createdAt: { gte: daysAgo(0) } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...earning, createdAt: { gte: daysAgo(7) } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...earning, createdAt: { gte: daysAgo(30) } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({ where: earning, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.product.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, slug: true, stock: true, category: true },
      orderBy: { stock: 'asc' },
      take: 12,
    }),
    prisma.orderItem.groupBy({
      by: ['slug', 'name'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    }),
    prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.order.aggregate({ where: { status: 'PENDING' }, _sum: { total: true } }),
  ]);

  const counts = statusGroups.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  return NextResponse.json({
    revenue: {
      today: today._sum.total ?? 0,
      week: week._sum.total ?? 0,
      month: month._sum.total ?? 0,
      allTime: allTime._sum.total ?? 0,
      pending: pendingValue._sum.total ?? 0,
    },
    orderCounts: {
      today: today._count._all,
      week: week._count._all,
      month: month._count._all,
      allTime: allTime._count._all,
      byStatus: counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    },
    averageOrderValue:
      allTime._count._all > 0 ? Math.round((allTime._sum.total ?? 0) / allTime._count._all) : 0,
    customerCount,
    productCount,
    lowStock,
    topProducts: topItems.map((i) => ({
      slug: i.slug,
      name: i.name,
      unitsSold: i._sum.quantity ?? 0,
    })),
    recentOrders,
  });
}
