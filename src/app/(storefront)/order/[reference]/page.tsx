'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckIcon, SpinnerIcon, TruckIcon, WhatsAppIcon } from '@/components/icons';
import { formatNaira } from '@/lib/format';
import { STORE } from '@/lib/config';
import type { OrderDTO } from '@/lib/types';

function OrderConfirmation() {
  const params = useParams<{ reference: string }>();
  const search = useSearchParams();
  const reference = params.reference;
  const method = search.get('method');

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [paid, setPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Paystack redirects back here after payment — confirm with them directly
      // rather than waiting on the webhook, so the page tells the truth now.
      if (method !== 'whatsapp') {
        try {
          const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setPaid(Boolean(data.paid));
          }
        } catch {
          /* falls back to the order status below */
        }
      }

      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(reference)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setOrder(data.order);
        }
      } catch {
        /* order may not be persisted when running without a database */
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reference, method]);

  const isPaid = paid === true || order?.status === 'PAID';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="card relative overflow-hidden p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-clay-100 blur-[70px]"
        />

        <div className="relative">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-clay-300 bg-clay-100">
            {loading ? (
              <SpinnerIcon width={26} height={26} className="text-clay-600" />
            ) : (
              <CheckIcon width={28} height={28} className="text-clay-600" />
            )}
          </div>

          <p className="eyebrow mb-3">
            {isPaid ? 'Payment received' : 'Order placed'}
          </p>

          <h1 className="font-display text-4xl font-light leading-tight text-ink-900 sm:text-5xl">
            Thank you{order?.customerName ? `, ${order.customerName.split(' ')[0]}` : ''}.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-600">
            {method === 'whatsapp' ? (
              <>
                Your order summary has been opened in WhatsApp. Send it to us and we will confirm
                stock and payment details right away. If the tab did not open, tap the button below.
              </>
            ) : isPaid ? (
              <>
                We have your payment and your order is being packed. You will get a WhatsApp message
                the moment it leaves us.
              </>
            ) : (
              <>
                We have your order. As soon as payment clears we will pack it and send you a
                tracking message on WhatsApp.
              </>
            )}
          </p>

          <div className="mt-8 inline-flex flex-col items-center gap-1 rounded-2xl border border-paper-200 px-8 py-5">
            <span className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-500">
              Order reference
            </span>
            <span className="font-display text-3xl font-light tracking-wide text-clay-600">
              {reference}
            </span>
          </div>

          {order && (
            <div className="mt-9 text-left">
              <div className="rule mb-6" />
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li key={item.slug} className="flex justify-between gap-4 text-sm">
                    <span className="min-w-0 text-ink-700">
                      {item.quantity} × {item.name}
                    </span>
                    <span className="shrink-0 text-ink-800">
                      {formatNaira(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2 border-t border-paper-200 pt-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-600">Subtotal</dt>
                  <dd className="text-ink-800">{formatNaira(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">Delivery ({order.state})</dt>
                  <dd className="text-ink-800">
                    {order.deliveryFee === 0 ? 'Free' : formatNaira(order.deliveryFee)}
                  </dd>
                </div>
                <div className="flex justify-between pt-2 text-base">
                  <dt className="text-ink-700">Total</dt>
                  <dd className="font-display text-2xl font-light text-clay-600">
                    {formatNaira(order.total)}
                  </dd>
                </div>
              </dl>

              <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
                <TruckIcon width={15} height={15} className="mt-0.5 shrink-0 text-clay-500" />
                Delivering to {order.address}, {order.city}.
              </p>
            </div>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
                `Hello ${STORE.name}, I am following up on order ${reference}.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-clay"
            >
              <WhatsAppIcon width={16} height={16} />
              Message us about this order
            </a>
            <Link href="/shop" className="btn btn-outline">
              Keep shopping
            </Link>
          </div>

          <p className="mt-7 text-xs text-ink-500">
            Save your reference — quote it in any message and we will find your order instantly.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <SpinnerIcon width={28} height={28} className="text-clay-500" />
        </div>
      }
    >
      <OrderConfirmation />
    </Suspense>
  );
}
