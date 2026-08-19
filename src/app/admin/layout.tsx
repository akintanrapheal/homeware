import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Store admin',
  // The back office should never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

/** Bare admin shell — no storefront header, footer, cart drawer or chat button. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}
