'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCart, useCartDetails } from './cart-provider';
import { ProductImage } from './product-art';
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon } from './icons';
import { formatNaira } from '@/lib/format';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/config';

export function CartDrawer() {
  const { isOpen, close, subtotal, setQuantity, remove, count } = useCart();
  const details = useCartDetails();

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  return (
    <div
      className={`fixed inset-0 z-[70] ${isOpen ? '' : 'pointer-events-none'}`}
      /* See the note in site-header: inert keeps the closed drawer's controls
         out of the tab order, which aria-hidden does not do. */
      inert={!isOpen}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity duration-400 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-label="Shopping bag"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-paper-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-light text-ink-900">Your Bag</h2>
            <p className="mt-0.5 text-xs tracking-wide text-ink-600">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1.5 text-ink-700 transition hover:text-clay-600"
            aria-label="Close bag"
          >
            <CloseIcon />
          </button>
        </header>

        {details.length > 0 && (
          <div className="border-b border-paper-200 px-5 py-4 sm:px-6">
            <p className="mb-2 text-xs text-ink-600">
              {remaining > 0 ? (
                <>
                  Add <span className="text-clay-600">{formatNaira(remaining)}</span> more for free
                  delivery
                </>
              ) : (
                <span className="text-clay-600">Free nationwide delivery unlocked</span>
              )}
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-paper-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-clay-500 to-clay-300 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 sm:px-6">
          {details.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 py-16 text-center">
              <p className="font-display text-2xl font-light text-ink-700">
                Your bag is empty
              </p>
              <p className="max-w-xs text-sm text-ink-500">
                Start with the pieces you reach for daily — a good pan, a sharp knife, a board.
              </p>
              <Link href="/shop" onClick={close} className="btn btn-outline">
                Browse the range
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-paper-200">
              {details.map(({ product, quantity, lineTotal }) => (
                <li key={product.slug} className="flex gap-4 py-5">
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={close}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-paper-100"
                  >
                    <ProductImage
                      imageUrl={product.imageUrl}
                      name={product.name}
                      category={product.category}
                      accent={product.accent}
                      slug={product.slug}
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={close}
                      className="block truncate font-display text-lg font-light text-ink-900 hover:text-clay-600"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {product.sizeLabel ? `${product.sizeLabel} · ` : ''}
                      {formatNaira(product.price)}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-full border border-paper-300">
                        <button
                          type="button"
                          onClick={() => setQuantity(product.slug, quantity - 1)}
                          className="p-2 text-ink-700 transition hover:text-clay-600"
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          <MinusIcon width={14} height={14} />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums text-ink-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(product.slug, quantity + 1)}
                          className="p-2 text-ink-700 transition hover:text-clay-600"
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          <PlusIcon width={14} height={14} />
                        </button>
                      </div>

                      <span className="text-sm text-ink-900">{formatNaira(lineTotal)}</span>

                      <button
                        type="button"
                        onClick={() => remove(product.slug)}
                        className="p-1.5 text-ink-500 transition hover:text-rose-accent"
                        aria-label={`Remove ${product.name}`}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {details.length > 0 && (
          <footer className="border-t border-paper-200 px-5 py-5 pb-safe sm:px-6">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm text-ink-600">Subtotal</span>
              <span className="font-display text-2xl font-light text-ink-900">
                {formatNaira(subtotal)}
              </span>
            </div>
            <p className="mb-4 text-xs text-ink-500">
              Delivery is calculated at checkout.
            </p>
            <Link href="/checkout" onClick={close} className="btn btn-clay w-full">
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={close}
              className="mt-2 block w-full py-2 text-center text-xs uppercase tracking-[0.2em] text-ink-600 transition hover:text-clay-600"
            >
              View full bag
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
