'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart, useCartDetails } from '@/components/cart-provider';
import { useAccount } from '@/components/account-provider';
import { ProductImage } from '@/components/product-art';
import { ShieldIcon, SpinnerIcon, TruckIcon, WhatsAppIcon } from '@/components/icons';
import { formatNaira } from '@/lib/format';
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD, deliveryFeeFor } from '@/lib/config';

type PaymentMethod = 'whatsapp' | 'paystack';

const PAYSTACK_ENABLED = Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);

export default function CheckoutPage() {
  const router = useRouter();
  const { subtotal, clear, priced } = useCart();
  const { customer, ready: accountReady } = useAccount();
  const details = useCartDetails();

  const [zone, setZone] = useState(DELIVERY_ZONES[0].id);

  // Adopt the saved delivery zone once the profile arrives, but never fight the
  // shopper: if they have already picked one, leave it alone.
  const [zoneTouched, setZoneTouched] = useState(false);
  useEffect(() => {
    if (!zoneTouched && customer?.zone && DELIVERY_ZONES.some((z) => z.id === customer.zone)) {
      setZone(customer.zone);
    }
  }, [customer, zoneTouched]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('whatsapp');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const deliveryFee = useMemo(() => deliveryFeeFor(zone, subtotal), [zone, subtotal]);
  const total = subtotal + deliveryFee;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || details.length === 0) return;

    setSubmitting(true);
    setError('');

    const form = new FormData(event.currentTarget);
    // One key per checkout attempt, so a retry on a flaky connection resolves to
    // the same order instead of a second one.
    const idempotencyKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    const payload = {
      customerName: String(form.get('customerName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      address: String(form.get('address') ?? ''),
      city: String(form.get('city') ?? ''),
      zone,
      note: String(form.get('note') ?? '') || null,
      paymentMethod,
      idempotencyKey,
      items: details.map((d) => ({ slug: d.slug, quantity: d.quantity })),
    };

    // The WhatsApp tab must be opened synchronously-ish or Safari blocks it, so
    // reserve it before awaiting the network round trip.
    const pending = paymentMethod === 'whatsapp' ? window.open('', '_blank') : null;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? 'Could not place your order');

      const reference: string = data.order.reference;

      if (paymentMethod === 'paystack') {
        const initRes = await fetch('/api/paystack/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData?.error ?? 'Could not start payment');

        clear();
        window.location.href = initData.authorizationUrl;
        return;
      }

      if (pending) pending.location.href = data.whatsappUrl;
      else window.open(data.whatsappUrl, '_blank');

      clear();
      // The order API answers 201 with persisted:false when it could not write to
      // the database. Passing that on stops the confirmation page assuring the
      // shopper their order is recorded when the shop has no record of it.
      const unsaved = data.persisted === false ? '&unsaved=1' : '';
      router.push(`/order/${reference}?method=whatsapp${unsaved}`);
    } catch (err) {
      pending?.close();
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // Hold the form until prices land, otherwise the summary renders an empty
  // order at a total of zero for a beat on every reload.
  if (!priced) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SpinnerIcon width={28} height={28} className="text-clay-500" />
      </div>
    );
  }

  // Only declare the bag empty once prices have landed, never mid-fetch.
  if (details.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-4xl font-light text-ink-900">Your bag is empty</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm text-ink-600">
          Add something you love and we will get it to your door.
        </p>
        <Link href="/shop" className="btn btn-clay mt-8">
          Shop the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-9">
        <nav aria-label="Breadcrumb" className="mb-4 text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">
          <Link href="/cart" className="transition hover:text-clay-600">
            Bag
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-600">Checkout</span>
        </nav>
        <h1 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">Checkout</h1>
        <p className="mt-2 text-sm text-ink-500">
          Two minutes. We confirm every order personally before it ships.
        </p>
      </header>

      {/*
        Guest checkout is the default and always available. Signing in is
        offered as a convenience only — it must never become a gate.
      */}
      {accountReady && !customer && (
        <div className="card mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-600">
            <span className="text-ink-900">Checking out as a guest.</span>{' '}
            Sign in to fill this in automatically and track your order.
          </p>
          <Link
            href="/account/login?next=%2Fcheckout"
            className="btn btn-outline shrink-0 !py-2.5 text-[0.65rem]"
          >
            Sign in
          </Link>
        </div>
      )}

      {accountReady && customer && (
        <p className="card mb-8 p-4 text-sm text-ink-600">
          Signed in as <span className="text-ink-900">{customer.email}</span> — this order will
          appear in your account.
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
        <div className="space-y-10">
          <section>
            <h2 className="eyebrow mb-5">1 · Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="customerName" className="label">
                  Full name
                </label>
                <input key={`customerName-${customer?.id ?? "guest"}`} defaultValue={customer?.name ?? ''} id="customerName" name="customerName" required className="field" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input key={`email-${customer?.id ?? "guest"}`} defaultValue={customer?.email ?? ''} id="email" name="email" type="email" required className="field" autoComplete="email" />
              </div>
              <div>
                <label htmlFor="phone" className="label">
                  Phone (WhatsApp)
                </label>
                <input
                  key={`phone-${customer?.id ?? 'guest'}`}
                  defaultValue={customer?.phone ?? ''}
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="0801 234 5678"
                  className="field"
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-5">2 · Delivery</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="label">
                  Address
                </label>
                <input
                  key={`address-${customer?.id ?? 'guest'}`}
                  defaultValue={customer?.address ?? ''}
                  id="address"
                  name="address"
                  required
                  placeholder="House number, street, landmark"
                  className="field"
                  autoComplete="street-address"
                />
              </div>
              <div>
                <label htmlFor="city" className="label">
                  City / area
                </label>
                <input key={`city-${customer?.id ?? "guest"}`} defaultValue={customer?.city ?? ''} id="city" name="city" required className="field" autoComplete="address-level2" />
              </div>
              <div>
                <label htmlFor="zone" className="label">
                  Delivery area
                </label>
                <select
                  id="zone"
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    setZoneTouched(true);
                  }}
                  className="field"
                >
                  {DELIVERY_ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label} — {z.fee === 0 ? 'Free' : formatNaira(z.fee)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="note" className="label">
                  Order note (optional)
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  placeholder="Gift wrapping, a message on the card, delivery timing…"
                  className="field resize-none"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-5">3 · Payment</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('whatsapp')}
                className={`card flex items-start gap-3 p-5 text-left transition ${
                  paymentMethod === 'whatsapp' ? 'border-clay-500' : ''
                }`}
              >
                <WhatsAppIcon width={20} height={20} className="mt-0.5 shrink-0 text-clay-500" />
                <span>
                  <span className="block text-sm text-ink-900">Order on WhatsApp</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                    We confirm stock, then send bank details or a payment link. Most popular.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => PAYSTACK_ENABLED && setPaymentMethod('paystack')}
                disabled={!PAYSTACK_ENABLED}
                className={`card flex items-start gap-3 p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  paymentMethod === 'paystack' ? 'border-clay-500' : ''
                }`}
              >
                <ShieldIcon width={20} height={20} className="mt-0.5 shrink-0 text-clay-500" />
                <span>
                  <span className="block text-sm text-ink-900">Pay now with card</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                    {PAYSTACK_ENABLED
                      ? 'Card, transfer or USSD via Paystack. Instant confirmation.'
                      : 'Card payment is being set up — use WhatsApp for now.'}
                  </span>
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6 sm:p-7">
            <h2 className="font-display text-2xl font-light text-ink-900">Your order</h2>

            <ul className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
              {details.map(({ product, quantity, lineTotal }) => (
                <li key={product.slug} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-paper-100">
                    <ProductImage
                      imageUrl={product.imageUrl}
                      name={product.name}
                      category={product.category}
                      accent={product.accent}
                      slug={product.slug}
                    />
                    <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-clay-600 text-[0.62rem] font-semibold text-paper-50">
                      {quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-900">{product.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatNaira(product.price)} each
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-ink-800">
                    {formatNaira(lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="rule my-5" />

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="text-ink-900">{formatNaira(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Delivery</dt>
                <dd className={freeDelivery || deliveryFee === 0 ? 'text-clay-600' : 'text-ink-900'}>
                  {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-paper-200 pt-5">
              <span className="text-sm text-ink-600">Total</span>
              <span className="font-display text-3xl font-light text-clay-600">
                {formatNaira(total)}
              </span>
            </div>

            {error && (
              <p className="mt-5 rounded-xl border border-rose-accent/40 bg-rose-accent/8 px-4 py-3 text-xs leading-relaxed text-rose-accent">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-clay mt-6 w-full disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <SpinnerIcon width={16} height={16} />
                  Placing order…
                </>
              ) : paymentMethod === 'whatsapp' ? (
                <>
                  <WhatsAppIcon width={16} height={16} />
                  Place order on WhatsApp
                </>
              ) : (
                <>Pay {formatNaira(total)}</>
              )}
            </button>

            <p className="mt-4 flex items-start gap-2 text-[0.7rem] leading-relaxed text-ink-500">
              <TruckIcon width={14} height={14} className="mt-0.5 shrink-0 text-clay-500" />
              Same-day dispatch on orders placed before 3pm WAT. You will get a tracking message on
              WhatsApp the moment it leaves us.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
