'use client';

import Link from 'next/link';
import { useCart, useCartDetails } from '@/components/cart-provider';
import { ProductImage } from '@/components/product-art';
import { ArrowRightIcon, MinusIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { formatNaira } from '@/lib/format';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/config';

export default function CartPage() {
  const { subtotal, setQuantity, remove, priced, count } = useCart();
  const details = useCartDetails();
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-9">
        <nav aria-label="Breadcrumb" className="mb-4 text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">
          <Link href="/" className="transition hover:text-clay-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-600">Bag</span>
        </nav>
        <h1 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">Your Bag</h1>
        {priced && (
          <p className="mt-2 text-sm text-ink-500">
            {count} {count === 1 ? 'item' : 'items'}
          </p>
        )}
      </header>

      {!priced ? (
        <div className="card h-64 animate-pulse" />
      ) : details.length === 0 ? (
        <div className="card flex flex-col items-center gap-5 px-6 py-24 text-center">
          <p className="font-display text-3xl font-light text-ink-700">Your bag is empty</p>
          <p className="max-w-sm text-sm leading-relaxed text-ink-500">
            Nothing in here yet. The cast iron casserole and the end-grain board are where most
            people start — both outlast everything else in the kitchen.
          </p>
          <Link href="/shop" className="btn btn-clay mt-2">
            Shop the range
            <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          <ul className="divide-y divide-paper-200 border-y border-paper-200">
            {details.map(({ product, quantity, lineTotal }) => (
              <li key={product.slug} className="flex gap-4 py-6 sm:gap-6">
                <Link
                  href={`/product/${product.slug}`}
                  className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-paper-100 sm:h-36 sm:w-32"
                >
                  <ProductImage
                    imageUrl={product.imageUrl}
                    name={product.name}
                    category={product.category}
                    accent={product.accent}
            slug={product.slug}
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${product.slug}`}
                        className="font-display text-xl font-light text-ink-900 transition hover:text-clay-600 sm:text-2xl"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink-500">
                        {product.sizeLabel ? `${product.sizeLabel} · ` : ''}
                        {formatNaira(product.price)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(product.slug)}
                      className="tap shrink-0 -mr-2 text-ink-500 transition hover:text-rose-accent"
                      aria-label={`Remove ${product.name}`}
                    >
                      <TrashIcon width={17} height={17} />
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <div className="flex items-center rounded-full border border-paper-300">
                      <button
                        type="button"
                        onClick={() => setQuantity(product.slug, quantity - 1)}
                        className="tap-sm text-ink-700 transition hover:text-clay-600"
                        aria-label="Decrease quantity"
                      >
                        <MinusIcon width={14} height={14} />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums text-ink-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(product.slug, quantity + 1)}
                        className="tap-sm text-ink-700 transition hover:text-clay-600"
                        aria-label="Increase quantity"
                      >
                        <PlusIcon width={14} height={14} />
                      </button>
                    </div>
                    <span className="font-display text-xl font-light text-clay-600">
                      {formatNaira(lineTotal)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card p-6 sm:p-7">
              <h2 className="font-display text-2xl font-light text-ink-900">Order summary</h2>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-600">Subtotal</dt>
                  <dd className="text-ink-900">{formatNaira(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">Delivery</dt>
                  <dd className="text-ink-600">
                    {remaining > 0 ? 'Calculated at checkout' : 'Free'}
                  </dd>
                </div>
              </dl>

              {remaining > 0 && (
                <p className="mt-4 rounded-xl border border-clay-300 bg-clay-100 px-4 py-3 text-xs leading-relaxed text-clay-700">
                  Add {formatNaira(remaining)} more and delivery is free anywhere in Nigeria.
                </p>
              )}

              <div className="rule my-6" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-600">Total</span>
                <span className="font-display text-3xl font-light text-ink-900">
                  {formatNaira(subtotal)}
                </span>
              </div>

              <Link href="/checkout" className="btn btn-clay mt-7 w-full">
                Proceed to checkout
                <ArrowRightIcon width={16} height={16} />
              </Link>
              <Link
                href="/shop"
                className="mt-3 block w-full py-2 text-center text-xs uppercase tracking-[0.18em] text-ink-500 transition hover:text-clay-600"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
