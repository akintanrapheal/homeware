import Link from 'next/link';
import { ProductArt } from '@/components/product-art';

/**
 * Storefront 404 — what a shopper sees when notFound() fires inside the shop,
 * most often a product slug that no longer exists. Being in the (storefront)
 * group, it inherits the header, footer and cart drawer, so the bag survives
 * and there is always a way back into the collection.
 */
export default function StorefrontNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 w-40 opacity-70">
        <ProductArt category="cookware" accent="clay" className="w-full" />
      </div>
      <p className="eyebrow mb-4">404</p>
      <h1 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">
        We could not find <span className="italic text-clay-600">that one</span>
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-600">
        It may have sold out and been retired. Tell us what you were after and we will find you the
        closest thing — or something better.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/shop" className="btn btn-clay">
          Shop the range
        </Link>
        <Link href="/contact" className="btn btn-outline">
          Ask us
        </Link>
      </div>
    </div>
  );
}
