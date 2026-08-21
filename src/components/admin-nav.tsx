'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BagIcon,
  StarIcon,
  ShieldIcon,
  CloseIcon,
  MenuIcon,
  SparkleIcon,
  TruckIcon,
  UserIcon,
} from './icons';

/**
 * Each entry names the permission that reveals it. A staff member who cannot
 * change prices should not be shown a Products link that 403s when they press
 * it — hiding it is clearer than refusing it.
 */
const LINKS: { href: string; label: string; icon: typeof BagIcon; permission: string }[] = [
  { href: '/admin', label: 'Dashboard', icon: SparkleIcon, permission: 'orders.view' },
  { href: '/admin/orders', label: 'Orders', icon: TruckIcon, permission: 'orders.view' },
  { href: '/admin/products', label: 'Products', icon: BagIcon, permission: 'products.view' },
  { href: '/admin/categories', label: 'Categories', icon: SparkleIcon, permission: 'categories.manage' },
  { href: '/admin/reviews', label: 'Reviews', icon: StarIcon, permission: 'reviews.manage' },
  { href: '/admin/customers', label: 'Customers', icon: UserIcon, permission: 'customers.view' },
  { href: '/admin/users', label: 'Staff', icon: ShieldIcon, permission: 'users.manage' },
  { href: '/admin/settings', label: 'Settings', icon: ShieldIcon, permission: 'settings.manage' },
];

export function AdminNav({
  session,
  permissions,
}: {
  session?: { name: string; email: string; role: string };
  permissions?: string[];
}) {
  const allowed = LINKS.filter((l) => !permissions || permissions.includes(l.permission));
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // /admin must not light up for /admin/orders, but every other link should
  // stay active on its own sub-paths.
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="space-y-1">
      {allowed.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          data-active={isActive(href)}
          className="admin-nav-link"
        >
          <Icon width={17} height={17} />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile bar */}
      <div
        className="flex items-center justify-between border-b px-4 py-3 lg:hidden"
        style={{ borderColor: 'var(--admin-line)' }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          style={{ color: 'var(--admin-muted)' }}
        >
          <MenuIcon width={21} height={21} />
        </button>
        <span className="truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          {session?.name ?? 'Store admin'}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="text-xs"
          style={{ color: 'var(--admin-muted)' }}
        >
          Sign out
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} inert={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] p-4 transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ background: 'var(--admin-panel)', borderRight: '1px solid var(--admin-line)' }}
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Homeware & Co
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close admin menu"
              style={{ color: 'var(--admin-muted)' }}
            >
              <CloseIcon width={18} height={18} />
            </button>
          </div>
          {nav}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 flex-col justify-between border-r p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh"
        style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-panel)' }}
      >
        <div>
          <div className="mb-8 px-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Homeware & Co
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              Store administration
            </p>
          </div>
          {nav}
        </div>

        <div className="space-y-1">
          {session && (
            <div className="mb-2 px-3 py-2">
              <p className="truncate text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                {session.name}
              </p>
              <p className="truncate text-[0.68rem]" style={{ color: 'var(--admin-muted)' }}>
                {session.email} · {session.role.toLowerCase()}
              </p>
            </div>
          )}
          <Link href="/admin/profile" className="admin-nav-link">
            Your profile
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link">
            View storefront
          </a>
          <button type="button" onClick={signOut} className="admin-nav-link w-full text-left">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
