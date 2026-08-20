import { CartDrawer } from '@/components/cart-drawer';
import { getCategories } from '@/lib/repo';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFloat } from '@/components/whatsapp-float';

/** Shopfront chrome. Everything customer-facing renders inside this. */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  // Fetched once here rather than in the header itself: the header is a client
  // component, and the nav should not cost a round trip on every page.
  const categories = await getCategories();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-clay-600 focus:px-5 focus:py-2 focus:text-sm focus:text-paper-50"
      >
        Skip to content
      </a>
      <SiteHeader categories={categories} />
      <main id="main">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  );
}
