'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpinnerIcon } from '@/components/icons';
import { formatDate, formatNaira } from '@/lib/format';

type Status = 'PENDING' | 'PAID' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const STATUSES: Status[] = ['PENDING', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const STATUS_COLOR: Record<Status, string> = {
  PENDING: 'var(--admin-warn)',
  PAID: 'var(--admin-good)',
  PACKED: 'var(--admin-accent)',
  SHIPPED: 'var(--admin-accent)',
  DELIVERED: 'var(--admin-good)',
  CANCELLED: 'var(--admin-bad)',
};

interface AdminOrder {
  id: string;
  reference: string;
  customerId: string | null;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  status: Status;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?status=${filter}&limit=200`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not load orders');
      setOrders(data.orders);
      setNotice('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: Status) {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      // Roll back rather than leaving the screen claiming something that did
      // not happen — stock moves with these transitions.
      setOrders(previous);
      setNotice('Could not update that order.');
    }
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? orders.filter((o) =>
        [o.reference, o.customerName, o.email, o.phone, o.city]
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : orders;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Orders</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Moving an order to Cancelled returns its stock; moving it back out takes the stock again.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, name, phone…"
          className="admin-input max-w-xs"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | Status)}
          className="admin-input w-auto"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          No orders match.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => (
            <li key={order.id} className="admin-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {order.reference}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[0.62rem] font-medium"
                      style={{
                        color: STATUS_COLOR[order.status],
                        background: `color-mix(in oklab, ${STATUS_COLOR[order.status]} 15%, transparent)`,
                      }}
                    >
                      {order.status}
                    </span>
                    <span className="text-[0.68rem]" style={{ color: 'var(--admin-muted)' }}>
                      {order.paymentMethod}
                    </span>
                    {order.customerId ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.62rem]"
                        style={{
                          color: 'var(--admin-accent)',
                          background: 'color-mix(in oklab, var(--admin-accent) 15%, transparent)',
                        }}
                      >
                        account
                      </span>
                    ) : (
                      <span className="text-[0.62rem]" style={{ color: 'var(--admin-muted)' }}>
                        guest
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm" style={{ color: 'var(--admin-text)' }}>
                    {order.customerName} · {order.phone}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {order.address}, {order.city} — {order.state}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {order.email} · {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {formatNaira(order.total)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {formatNaira(order.subtotal)} + {formatNaira(order.deliveryFee)} delivery
                  </p>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-2">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md px-2.5 py-1 text-xs"
                    style={{ background: 'var(--admin-panel-2)', color: 'var(--admin-muted)' }}
                  >
                    {item.quantity} × {item.name} · {formatNaira(item.price * item.quantity)}
                  </li>
                ))}
              </ul>

              {order.note && (
                <p
                  className="mt-3 rounded-lg px-3 py-2 text-xs"
                  style={{
                    background: 'color-mix(in oklab, var(--admin-warn) 12%, transparent)',
                    color: 'var(--admin-warn)',
                  }}
                >
                  Note: {order.note}
                </p>
              )}

              <div
                className="mt-4 flex flex-wrap gap-1.5 border-t pt-3"
                style={{ borderColor: 'var(--admin-line)' }}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateStatus(order.id, s)}
                    disabled={order.status === s}
                    className="rounded-md px-2.5 py-1.5 text-[0.65rem] font-medium transition disabled:cursor-default"
                    style={
                      order.status === s
                        ? {
                            background: `color-mix(in oklab, ${STATUS_COLOR[s]} 20%, transparent)`,
                            color: STATUS_COLOR[s],
                          }
                        : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
