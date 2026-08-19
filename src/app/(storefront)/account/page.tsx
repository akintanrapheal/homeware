'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/account-provider';
import { CheckIcon, SpinnerIcon } from '@/components/icons';
import { formatDate, formatNaira } from '@/lib/format';
import { DELIVERY_ZONES } from '@/lib/config';

interface AccountOrder {
  id: string;
  reference: string;
  status: string;
  total: number;
  deliveryFee: number;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border-paper-300 text-ink-700',
  PAID: 'border-clay-500 text-clay-600',
  PACKED: 'border-jade-accent/60 text-jade-accent',
  SHIPPED: 'border-jade-accent/60 text-jade-accent',
  DELIVERED: 'border-jade-accent/60 text-jade-accent',
  CANCELLED: 'border-rose-accent/60 text-rose-accent',
};

export default function AccountPage() {
  const { customer, ready, signOut, setCustomer } = useAccount();
  const router = useRouter();

  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready && !customer) router.replace('/account/login');
  }, [ready, customer, router]);

  useEffect(() => {
    if (!customer) return;
    fetch('/api/account/orders')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [customer]);

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/account/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          phone: String(form.get('phone') ?? '') || null,
          address: String(form.get('address') ?? '') || null,
          city: String(form.get('city') ?? '') || null,
          zone: String(form.get('zone') ?? '') || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomer(data.customer);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !customer) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <SpinnerIcon width={28} height={28} className="text-clay-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Your account</p>
          <h1 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">
            Hello, {customer.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-ink-500">{customer.email}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
          className="text-xs uppercase tracking-[0.18em] text-ink-500 transition hover:text-clay-600"
        >
          Sign out
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
        <section>
          <h2 className="eyebrow mb-5">Order history</h2>

          {loadingOrders ? (
            <div className="card h-40 animate-pulse" />
          ) : orders.length === 0 ? (
            <div className="card flex flex-col items-center gap-4 p-10 text-center">
              <p className="font-display text-2xl font-light text-ink-700">No orders yet</p>
              <p className="max-w-xs text-sm text-ink-500">
                Orders you place while signed in will appear here with their status.
              </p>
              <Link href="/shop" className="btn btn-outline mt-1">
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-display text-xl font-light text-clay-600">
                          {order.reference}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] ${
                            STATUS_STYLE[order.status] ?? 'border-paper-300 text-ink-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-ink-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <p className="font-display text-2xl font-light text-ink-900">
                      {formatNaira(order.total)}
                    </p>
                  </div>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-full border border-paper-200 px-3 py-1 text-xs text-ink-600"
                      >
                        {item.quantity} × {item.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="eyebrow mb-5">Delivery details</h2>
          <form onSubmit={saveDetails} className="card space-y-4 p-6">
            <p className="text-xs leading-relaxed text-ink-500">
              Saved here, filled in for you at checkout.
            </p>

            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <input id="name" name="name" defaultValue={customer.name} className="field" />
            </div>

            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input id="phone" name="phone" defaultValue={customer.phone ?? ''} className="field" />
            </div>

            <div>
              <label htmlFor="address" className="label">
                Address
              </label>
              <input
                id="address"
                name="address"
                defaultValue={customer.address ?? ''}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="city" className="label">
                City / area
              </label>
              <input id="city" name="city" defaultValue={customer.city ?? ''} className="field" />
            </div>

            <div>
              <label htmlFor="zone" className="label">
                Delivery area
              </label>
              <select
                id="zone"
                name="zone"
                defaultValue={customer.zone ?? DELIVERY_ZONES[0].id}
                className="field"
              >
                {DELIVERY_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={saving} className="btn btn-clay w-full disabled:opacity-60">
              {saving ? (
                <SpinnerIcon width={16} height={16} />
              ) : saved ? (
                <>
                  <CheckIcon width={16} height={16} />
                  Saved
                </>
              ) : (
                'Save details'
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
