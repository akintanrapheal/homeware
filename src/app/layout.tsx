import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

import { CartProvider } from '@/components/cart-provider';
import { AccountProvider } from '@/components/account-provider';
import { STORE } from '@/lib/config';

/**
 * Root layout holds only what every route needs: fonts, global CSS and the
 * providers. The storefront's header, footer, cart drawer and chat button live
 * in the (storefront) route group, so /admin renders its own chrome instead of
 * inheriting a shopfront it has no use for.
 */

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(STORE.url),
  title: {
    default: `${STORE.name} — ${STORE.tagline}`,
    template: `%s · ${STORE.name}`,
  },
  description: STORE.description,
  keywords: [
    'cookware Nigeria',
    'kitchen equipment Lagos',
    'cast iron pot Nigeria',
    'dinner set Lagos',
    'kitchen storage Nigeria',
    'homeware Nigeria',
    'Homeware & Co',
  ],

  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: STORE.url,
    siteName: STORE.name,
    title: `${STORE.name} — ${STORE.tagline}`,
    description: STORE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${STORE.name} — ${STORE.tagline}`,
    description: STORE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <AccountProvider>
          <CartProvider>{children}</CartProvider>
        </AccountProvider>
      </body>
    </html>
  );
}
