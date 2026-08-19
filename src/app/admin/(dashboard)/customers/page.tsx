'use client';

import { useEffect, useState } from 'react';
import { SpinnerIcon } from '@/components/icons';
import { formatDate, formatNaira } from '@/lib/format';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  createdAt: string;
  orderCount: number;
  paidOrderCount: number;
  lifetimeValue: number;
  lastOrderAt: string | null;
}

interface Totals {
  registered: number;
  registeredRevenue: number;
  guestOrders: number;
  guestRevenue: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/admin/customers')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? 'Could not load customers');
        setCustomers(d.customers);
        setTotals(d.totals);
      })
      .catch((e) => setNotice(e.message))
      .finally(() => setLoading(false));
  }, []);

  const term = search.trim().toLowerCase();
  const visible = term
    ? customers.filter((c) =>
        [c.name, c.email, c.phone ?? '', c.city ?? ''].join(' ').toLowerCase().includes(term),
      )
    : customers;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Customers</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          People with an account. Guest orders have no account attached, so they are counted
          separately below rather than left out.
        </p>
      </header>

      {totals && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Registered', value: String(totals.registered) },
            { label: 'Account revenue', value: formatNaira(totals.registeredRevenue) },
            { label: 'Guest orders', value: String(totals.guestOrders) },
            { label: 'Guest revenue', value: formatNaira(totals.guestRevenue) },
          ].map((c) => (
            <div key={c.label} className="admin-panel p-4">
              <p className="admin-label">{c.label}</p>
              <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="admin-input max-w-xs"
        />
        <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
          {visible.length} shown
        </span>
      </div>

      {notice && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)',
            color: 'var(--admin-bad)',
          }}
        >
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <SpinnerIcon width={24} height={24} style={{ color: 'var(--admin-accent)' }} />
        </div>
      ) : visible.length === 0 ? (
        <p className="admin-panel p-12 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>
          No customer accounts yet. Guest orders still appear under Orders.
        </p>
      ) : (
        <div className="admin-panel overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: 'var(--admin-line)', color: 'var(--admin-muted)' }}
              >
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">Customer</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Contact</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Orders</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Spent</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Last order</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b" style={{ borderColor: 'var(--admin-line)' }}>
                  <td className="px-4 py-3">
                    <p style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                    {c.city && (
                      <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                        {c.city}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs" style={{ color: 'var(--admin-text)' }}>
                      {c.email}
                    </p>
                    {c.phone && (
                      <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                        {c.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3" style={{ color: 'var(--admin-text)' }}>
                    {c.paidOrderCount}
                    {c.orderCount !== c.paidOrderCount && (
                      <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                        {' '}
                        / {c.orderCount}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {formatNaira(c.lifetimeValue)}
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
