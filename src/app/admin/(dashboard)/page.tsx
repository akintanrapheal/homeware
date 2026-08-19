'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SpinnerIcon } from '@/components/icons';
import { formatDate, formatNaira } from '@/lib/format';

interface Stats {
  revenue: { today: number; week: number; month: number; allTime: number; pending: number };
  orderCounts: {
    today: number;
    week: number;
    month: number;
    allTime: number;
    byStatus: Record<string, number>;
    total: number;
  };
  averageOrderValue: number;
  customerCount: number;
  productCount: number;
  lowStock: { id: string; name: string; slug: string; stock: number; category: string }[];
  topProducts: { slug: string; name: string; unitsSold: number }[];
  recentOrders: {
    id: string;
    reference: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'var(--admin-warn)',
  PAID: 'var(--admin-good)',
  PACKED: 'var(--admin-accent)',
  SHIPPED: 'var(--admin-accent)',
  DELIVERED: 'var(--admin-good)',
  CANCELLED: 'var(--admin-bad)',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? 'Could not load dashboard');
        setStats(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <p
        className="admin-panel p-6 text-sm"
        style={{ color: 'var(--admin-bad)' }}
      >
        {error}
      </p>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon width={26} height={26} style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  const cards = [
    { label: 'Revenue today', value: formatNaira(stats.revenue.today), sub: `${stats.orderCounts.today} orders` },
    { label: 'Last 7 days', value: formatNaira(stats.revenue.week), sub: `${stats.orderCounts.week} orders` },
    { label: 'Last 30 days', value: formatNaira(stats.revenue.month), sub: `${stats.orderCounts.month} orders` },
    { label: 'All time', value: formatNaira(stats.revenue.allTime), sub: `${stats.orderCounts.allTime} orders` },
  ];

  return (
    <>
      <header className="mb-7">
        <h1 className="text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Revenue counts orders once they are paid or beyond — pending orders are shown separately.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="admin-panel p-4">
            <p className="admin-label">{c.label}</p>
            <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
              {c.value}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-muted)' }}>
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Awaiting payment', value: formatNaira(stats.revenue.pending), accent: 'var(--admin-warn)' },
          { label: 'Average order', value: formatNaira(stats.averageOrderValue) },
          { label: 'Registered customers', value: String(stats.customerCount) },
          { label: 'Products live', value: String(stats.productCount) },
        ].map((c) => (
          <div key={c.label} className="admin-panel p-4">
            <p className="admin-label">{c.label}</p>
            <p
              className="mt-2 text-lg font-semibold"
              style={{ color: c.accent ?? 'var(--admin-text)' }}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs" style={{ color: 'var(--admin-accent)' }}>
              View all
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>
              No orders yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate" style={{ color: 'var(--admin-text)' }}>
                      {o.customerName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                      {o.reference} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p style={{ color: 'var(--admin-text)' }}>{formatNaira(o.total)}</p>
                    <p className="text-xs" style={{ color: STATUS_COLOR[o.status] }}>
                      {o.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">Best sellers by units</h2>
          {stats.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>
              Nothing sold yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.topProducts.map((p) => {
                const max = stats.topProducts[0]?.unitsSold || 1;
                return (
                  <li key={p.slug}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate pr-3" style={{ color: 'var(--admin-text)' }}>
                        {p.name}
                      </span>
                      <span style={{ color: 'var(--admin-muted)' }}>{p.unitsSold}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--admin-panel-2)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p.unitsSold / max) * 100}%`,
                          background: 'var(--admin-accent)',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="admin-panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Low stock</h2>
            <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              5 or fewer left
            </span>
          </div>

          {stats.lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>
              Everything is comfortably in stock.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stats.lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--admin-panel-2)' }}
                >
                  <span className="truncate" style={{ color: 'var(--admin-text)' }}>
                    {p.name}
                  </span>
                  <span
                    className="shrink-0 font-semibold"
                    style={{ color: p.stock === 0 ? 'var(--admin-bad)' : 'var(--admin-warn)' }}
                  >
                    {p.stock === 0 ? 'Out' : p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
