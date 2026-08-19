'use client';

import { useState } from 'react';
import { useCart } from './cart-provider';
import { BagIcon, CheckIcon, MinusIcon, PlusIcon } from './icons';

export function AddToCartButton({
  slug,
  disabled,
  className = '',
  label = 'Add to bag',
}: {
  slug: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    if (disabled) return;
    add(slug, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`btn btn-clay disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {added ? <CheckIcon width={16} height={16} /> : <BagIcon width={16} height={16} />}
      {disabled ? 'Sold out' : added ? 'Added' : label}
    </button>
  );
}

/** Quantity stepper + add, used on the product detail page. */
export function AddToCartWithQuantity({ slug, stock }: { slug: string; stock: number }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = stock <= 0;
  const max = Math.max(1, Math.min(10, stock));

  function handleAdd() {
    if (soldOut) return;
    add(slug, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex items-center justify-between rounded-full border border-paper-300 px-2 sm:justify-start">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={soldOut || quantity <= 1}
          className="p-3 text-ink-700 transition hover:text-clay-600 disabled:opacity-30"
          aria-label="Decrease quantity"
        >
          <MinusIcon width={16} height={16} />
        </button>
        <span className="w-10 text-center tabular-nums text-ink-900" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(max, q + 1))}
          disabled={soldOut || quantity >= max}
          className="p-3 text-ink-700 transition hover:text-clay-600 disabled:opacity-30"
          aria-label="Increase quantity"
        >
          <PlusIcon width={16} height={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        className="btn btn-clay flex-1 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {added ? <CheckIcon width={16} height={16} /> : <BagIcon width={16} height={16} />}
        {soldOut ? 'Sold out' : added ? 'Added to bag' : 'Add to bag'}
      </button>
    </div>
  );
}
