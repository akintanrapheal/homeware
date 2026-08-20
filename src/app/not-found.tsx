import Link from 'next/link';
import { ProductArt } from '@/components/product-art';

/**
 * Root 404 — catches URLs that match no route at all.
 *
 * Deliberately self-contained. Next serialises the not-found boundary into
 * every route's payload, so importing SiteHeader/SiteFooter here would ship the
 * entire storefront chrome to every page, admin included. Storefront 404s
 * triggered by notFound() (a dead product slug, say) render through
 * (storefront)/not-found.tsx instead and keep the full header and footer.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" className="mb-10 leading-none" aria-label="Homeware & Co home">
        <span className="block font-display text-2xl font-light tracking-[0.18em] text-ink-900">
          HOMEWARE
        </span>
        <span className="eyebrow block text-[0.55rem]">& Co</span>
      </Link>

      <div className="mb-6 w-36 opacity-70">
        <ProductArt category="cookware" accent="clay" className="w-full" />
      </div>

      <p className="eyebrow mb-4">404</p>
      <h1 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">
        This page has <span className="italic text-clay-600">evaporated</span>
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-600">
        The link may be old, or the product has sold out and moved on. The range is still right
        where you left it.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/shop" className="btn btn-clay">
          Shop the range
        </Link>
        <Link href="/" className="btn btn-outline">
          Back home
        </Link>
      </div>

      <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink-500">
        <Link href="/shop?category=cookware" className="hover:text-clay-600">
          Cookware
        </Link>
        <Link href="/shop?category=knives" className="hover:text-clay-600">
          Knives
        </Link>
        <Link href="/shop?category=tableware" className="hover:text-clay-600">
          Tableware
        </Link>
        <Link href="/contact" className="hover:text-clay-600">
          Contact
        </Link>
      </nav>
    </div>
  );
}
