import Link from 'next/link';
import { ProductImage } from './product-art';
import { AddToCartButton } from './add-to-cart';
import { StarIcon } from './icons';
import { discountPercent, formatNaira } from '@/lib/format';
import { CATEGORY_LABEL, type Product } from '@/lib/types';

export function ProductCard({
  product,
  priority = false,
  className = '',
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const off = discountPercent(product.price, product.compareAt);
  const soldOut = product.stock <= 0;

  return (
    <article className={`card card-hover group flex flex-col overflow-hidden ${className}`}>
      {/*
        The quick-add button is a sibling of this link, never a child of it. A
        <button> inside an <a> is invalid HTML, and the anchor's navigation still
        fires on click — so "Quick add" used to add the item and then bounce the
        shopper onto the product page.
      */}
      <div className="relative aspect-[4/5] overflow-hidden bg-paper-100">
        <Link href={`/product/${product.slug}`} className="block h-full w-full">
          <div className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
            <ProductImage
              imageUrl={product.imageUrl}
              name={product.name}
              category={product.category}
              accent={product.accent}
            slug={product.slug}
            shape={product.artShape ?? undefined}
              priority={priority}
            />
          </div>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {off !== null && (
            <span className="rounded-full bg-clay-600 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-paper-50">
              −{off}%
            </span>
          )}
          {product.bestseller && !soldOut && (
            <span className="rounded-full border border-clay-300 bg-paper-100 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-clay-600 backdrop-blur-sm">
              Bestseller
            </span>
          )}
          {soldOut && (
            <span className="rounded-full bg-paper-50/90 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-ink-700 backdrop-blur-sm">
              Sold out
            </span>
          )}
        </div>

        {/* Desktop quick-add slides up on hover; touch devices use the always-on button below. */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-3 opacity-0 transition-all duration-400 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 lg:block">
          <AddToCartButton
            slug={product.slug}
            disabled={soldOut}
            className="w-full !py-3 text-[0.65rem]"
            label="Quick add"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="eyebrow mb-1.5 text-[0.58rem]">{CATEGORY_LABEL[product.category]}</p>

        <h3 className="mb-1">
          <Link
            href={`/product/${product.slug}`}
            className="font-display text-lg font-light leading-snug text-ink-900 transition-colors hover:text-clay-600 sm:text-xl"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mb-3 flex items-center gap-1.5 text-[0.7rem] text-ink-500">
          <StarIcon width={12} height={12} className="text-clay-500" />
          <span className="tabular-nums">{product.rating.toFixed(1)}</span>
          <span>({product.reviewCount})</span>
          {product.sizeLabel && <span className="ml-auto">{product.sizeLabel}</span>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="font-display text-xl font-light text-clay-600">
              {formatNaira(product.price)}
            </p>
            {product.compareAt && (
              <p className="text-xs text-ink-500 line-through">
                {formatNaira(product.compareAt)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 lg:hidden">
          <AddToCartButton
            slug={product.slug}
            disabled={soldOut}
            className="w-full !py-3 text-[0.65rem]"
          />
        </div>
      </div>
    </article>
  );
}
