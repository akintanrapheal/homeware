'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProductImage } from '@/components/product-art';
import { MailIcon, PhoneIcon, PinIcon, SpinnerIcon, WhatsAppIcon } from '@/components/icons';
import { formatDate, formatNaira } from '@/lib/format';
import { STORE } from '@/lib/config';
import type { Accent } from '@/lib/types';

type Status = 'PENDING' | 'PAID' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const FLOW: Status[] = ['PENDING', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];
const ALL: Status[] = [...FLOW, 'CANCELLED'];

const STATUS_COLOR: Record<Status, string> = {
  PENDING: 'var(--admin-warn)',
  PAID: 'var(--admin-good)',
  PACKED: 'var(--admin-accent)',
  SHIPPED: 'var(--admin-accent)',
  DELIVERED: 'var(--admin-good)',
  CANCELLED: 'var(--admin-bad)',
};

interface DetailItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  category: string;
  accent: Accent;
  currentStock: number | null;
  priceChanged: boolean;
  currentPrice: number | null;
  stillListed: boolean;
}

interface OrderDetail {
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
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: DetailItem[];
  customer: { id: string; name: string; email: string; phone: string | null } | null;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/detail`);
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not load the order');
      setOrder(d.order);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load the order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: Status) {
    if (!order || saving) return;
    const previous = order.status;
    setSaving(true);
    setOrder({ ...order, status });

    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    setSaving(false);
    if (!res.ok) {
      setOrder({ ...order, status: previous });
      setNotice('Could not update the status.');
    } else {
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon width={26} height={26} style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="admin-panel p-10 text-center">
        <p className="text-sm" style={{ color: 'var(--admin-bad)' }}>{notice || 'Order not found.'}</p>
        <Link href="/admin/orders" className="admin-btn admin-btn-ghost mt-4 inline-flex">
          Back to orders
        </Link>
      </div>
    );
  }

  const waMessage = `Hello ${order.customerName.split(' ')[0]}, this is ${STORE.name} about your order ${order.reference}.`;
  const waLink = `https://wa.me/${order.phone.replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(waMessage)}`;
  const stepIndex = FLOW.indexOf(order.status);

  return (
    <>
      <header className="mb-6">
        <Link href="/admin/orders" className="text-xs" style={{ color: 'var(--admin-accent)' }}>
          ← Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl">{order.reference}</h1>
          <span
            className="rounded-full px-2.5 py-1 text-[0.65rem] font-medium"
            style={{
              color: STATUS_COLOR[order.status],
              background: `color-mix(in oklab, ${STATUS_COLOR[order.status]} 15%, transparent)`,
            }}
          >
            {order.status}
          </span>
          <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
            {order.paymentMethod} · {order.customerId ? 'account' : 'guest'} · {formatDate(order.createdAt)}
          </span>
        </div>
      </header>

      {notice && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)', color: 'var(--admin-bad)' }}
        >
          {notice}
        </p>
      )}

      {/* Fulfilment progress */}
      <section className="admin-panel mb-4 p-5">
        <h2 className="mb-4 text-sm font-semibold">Fulfilment</h2>

        {order.status === 'CANCELLED' ? (
          <p className="mb-4 text-sm" style={{ color: 'var(--admin-bad)' }}>
            This order is cancelled. Its stock has been returned to the catalogue.
          </p>
        ) : (
          <ol className="mb-5 flex flex-wrap gap-1">
            {FLOW.map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-1" style={{ minWidth: '5.5rem' }}>
                <div className="w-full">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ background: i <= stepIndex ? 'var(--admin-accent)' : 'var(--admin-panel-2)' }}
                  />
                  <span
                    className="mt-1.5 block text-[0.62rem]"
                    style={{ color: i <= stepIndex ? 'var(--admin-text)' : 'var(--admin-muted)' }}
                  >
                    {s}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          {ALL.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              disabled={order.status === s || saving}
              className="rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-default"
              style={
                order.status === s
                  ? { background: `color-mix(in oklab, ${STATUS_COLOR[s]} 20%, transparent)`, color: STATUS_COLOR[s] }
                  : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
              }
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
          Moving to Cancelled returns this order&apos;s stock; moving it back out takes the stock again.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Items */}
        <section className="admin-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">Items</h2>
          <ul className="space-y-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4">
                <div
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border"
                  style={{ borderColor: 'var(--admin-line)', background: '#fff' }}
                >
                  <ProductImage
                    imageUrl={item.imageUrl}
                    name={item.name}
                    category={item.category}
                    accent={item.accent}
                    slug={item.slug}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p style={{ color: 'var(--admin-text)' }}>{item.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-muted)' }}>
                        {item.quantity} × {formatNaira(item.price)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {formatNaira(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem]">
                    {item.stillListed ? (
                      <span
                        style={{
                          color: (item.currentStock ?? 0) > 0 ? 'var(--admin-muted)' : 'var(--admin-bad)',
                        }}
                      >
                        {item.currentStock} in stock now
                      </span>
                    ) : (
                      <span style={{ color: 'var(--admin-warn)' }}>No longer in the catalogue</span>
                    )}
                    {item.priceChanged && item.currentPrice !== null && (
                      <span style={{ color: 'var(--admin-warn)' }}>
                        price is now {formatNaira(item.currentPrice)}
                      </span>
                    )}
                    <Link href={`/product/${item.slug}`} target="_blank" style={{ color: 'var(--admin-accent)' }}>
                      view in shop
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 border-t pt-4 text-sm" style={{ borderColor: 'var(--admin-line)' }}>
            <div className="flex justify-between">
              <dt style={{ color: 'var(--admin-muted)' }}>Subtotal</dt>
              <dd>{formatNaira(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: 'var(--admin-muted)' }}>Delivery — {order.state}</dt>
              <dd>{order.deliveryFee === 0 ? 'Free' : formatNaira(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold" style={{ borderColor: 'var(--admin-line)' }}>
              <dt>Total</dt>
              <dd>{formatNaira(order.total)}</dd>
            </div>
          </dl>
        </section>

        {/* Customer + delivery */}
        <section className="space-y-4">
          <div className="admin-panel p-5">
            <h2 className="mb-4 text-sm font-semibold">Customer</h2>
            <p style={{ color: 'var(--admin-text)' }}>{order.customerName}</p>
            {order.customerId && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-accent)' }}>
                Has an account
              </p>
            )}

            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <PhoneIcon width={15} height={15} className="mt-0.5 shrink-0" style={{ color: 'var(--admin-muted)' }} />
                <a href={`tel:${order.phone}`} style={{ color: 'var(--admin-text)' }}>{order.phone}</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MailIcon width={15} height={15} className="mt-0.5 shrink-0" style={{ color: 'var(--admin-muted)' }} />
                <a href={`mailto:${order.email}`} className="break-all" style={{ color: 'var(--admin-text)' }}>
                  {order.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <PinIcon width={15} height={15} className="mt-0.5 shrink-0" style={{ color: 'var(--admin-muted)' }} />
                <span style={{ color: 'var(--admin-text)' }}>
                  {order.address}, {order.city}
                  <br />
                  <span style={{ color: 'var(--admin-muted)' }}>{order.state}</span>
                </span>
              </li>
            </ul>

            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="admin-btn admin-btn-primary mt-4 w-full"
            >
              <WhatsAppIcon width={15} height={15} />
              Message on WhatsApp
            </a>
          </div>

          {order.note && (
            <div
              className="admin-panel p-5"
              style={{ borderColor: 'color-mix(in oklab, var(--admin-warn) 40%, var(--admin-line))' }}
            >
              <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--admin-warn)' }}>
                Customer note
              </h2>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{order.note}</p>
            </div>
          )}

          <div className="admin-panel p-5">
            <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
            <ul className="space-y-2 text-xs" style={{ color: 'var(--admin-muted)' }}>
              <li>Placed {formatDate(order.createdAt)}</li>
              {order.paidAt && <li>Paid {formatDate(order.paidAt)}</li>}
              <li>Last updated {formatDate(order.updatedAt)}</li>
              <li>Payment method: {order.paymentMethod}</li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
