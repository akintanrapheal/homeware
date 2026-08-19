import { CartDrawer } from '@/components/cart-drawer';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFloat } from '@/components/whatsapp-float';

/** Shopfront chrome. Everything customer-facing renders inside this. */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-clay-600 focus:px-5 focus:py-2 focus:text-sm focus:text-paper-50"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  );
}
