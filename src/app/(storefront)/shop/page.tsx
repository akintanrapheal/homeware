import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product-card';
import { ShopFilters } from '@/components/shop-filters';
import { Reveal } from '@/components/reveal';
import { getProducts } from '@/lib/repo';
import { CATEGORY_LABEL, type CategoryId } from '@/lib/types';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Shop the collection',
  description:
    'Every Homeware & Co piece — cookware, knives, small appliances, storage, tableware, glassware and kitchen textiles. Delivered across Nigeria.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pick(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const category = (pick(params, 'category') as CategoryId | 'all') ?? 'all';
  const family = pick(params, 'family') ?? 'all';
  const q = pick(params, 'q') ?? '';
  const sort = (pick(params, 'sort') as 'featured' | 'price-asc' | 'price-desc' | 'rating') ?? 'featured';

  const products = await getProducts({ category, family, search: q, sort });

  const heading =
    q
      ? `Results for “${q}”`
      : category !== 'all'
        ? CATEGORY_LABEL[category as CategoryId] ?? 'The Collection'
        : 'The Collection';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal as="header" className="mb-9">
        <nav aria-label="Breadcrumb" className="mb-4 text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">
          <Link href="/" className="transition hover:text-clay-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-600">Shop</span>
        </nav>

        <h1 className="font-display text-4xl font-light text-ink-900 sm:text-5xl lg:text-6xl">
          {heading}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
          Kitchen and table pieces held to one standard. Filter by category or material — or message
          us and we will tell you what is actually worth buying.
        </p>
      </Reveal>

      <div className="mb-10">
        <Suspense fallback={<div className="h-32" />}>
          <ShopFilters resultCount={products.length} />
        </Suspense>
      </div>

      {products.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-20 text-center">
          <p className="font-display text-3xl font-light text-ink-700">Nothing matches yet</p>
          <p className="max-w-sm text-sm text-ink-500">
            Try a different family or clear the filters — or tell us what you are looking for and we
            will source it.
          </p>
          <Link href="/shop" className="btn btn-outline mt-2">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.slug} delay={Math.min(i, 8) * 60}>
              <ProductCard product={product} priority={i < 4} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
