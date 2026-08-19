'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { CloseIcon, SearchIcon } from './icons';
import { CATEGORIES } from '@/lib/types';

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
];

const FAMILIES = ['oriental', 'floral', 'woody', 'fresh', 'gourmand'];

export function ShopFilters({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');

  const activeCategory = params.get('category') ?? 'all';
  const activeFamily = params.get('family') ?? 'all';
  const activeSort = params.get('sort') ?? 'featured';
  const activeQuery = params.get('q') ?? '';

  const push = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === 'all' || value === '') next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.push(qs ? `/shop?${qs}` : '/shop', { scroll: false });
    },
    [params, router],
  );

  const hasFilters =
    activeCategory !== 'all' || activeFamily !== 'all' || activeQuery !== '' || activeSort !== 'featured';

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push('q', term.trim());
        }}
        className="flex items-center gap-3 rounded-full border border-paper-300 bg-white px-5 py-1.5 transition focus-within:border-clay-500"
      >
        <SearchIcon width={17} height={17} className="shrink-0 text-clay-500" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name, note or family…"
          aria-label="Search products"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              push('q', null);
            }}
            className="shrink-0 p-1 text-ink-500 hover:text-clay-600"
            aria-label="Clear search"
          >
            <CloseIcon width={15} height={15} />
          </button>
        )}
      </form>

      {/* Category rail — scrolls horizontally on phones. */}
      <div className="rail -mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => push('category', null)}
          className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em] transition ${
            activeCategory === 'all'
              ? 'border-clay-500 bg-clay-100 text-clay-700'
              : 'border-paper-300 text-ink-600 hover:border-clay-500 hover:text-clay-600'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => push('category', category.id)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em] transition ${
              activeCategory === category.id
                ? 'border-clay-500 bg-clay-100 text-clay-700'
                : 'border-paper-300 text-ink-600 hover:border-clay-500 hover:text-clay-600'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="family" className="text-[0.68rem] uppercase tracking-[0.16em] text-ink-500">
            Family
          </label>
          <select
            id="family"
            value={activeFamily}
            onChange={(e) => push('family', e.target.value)}
            className="rounded-full border border-paper-300 bg-paper-100 px-3.5 py-2 text-xs capitalize text-ink-800 focus:border-clay-500 focus:outline-none"
          >
            <option value="all">All</option>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-[0.68rem] uppercase tracking-[0.16em] text-ink-500">
            Sort
          </label>
          <select
            id="sort"
            value={activeSort}
            onChange={(e) => push('sort', e.target.value)}
            className="rounded-full border border-paper-300 bg-paper-100 px-3.5 py-2 text-xs text-ink-800 focus:border-clay-500 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-ink-500">
          {resultCount} {resultCount === 1 ? 'product' : 'products'}
        </p>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              router.push('/shop', { scroll: false });
            }}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-600 transition hover:text-clay-600"
          >
            <CloseIcon width={13} height={13} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
