'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BagIcon,
  CloseIcon,
  MenuIcon,
  SparkleIcon,
  TruckIcon,
  UserIcon,
} from './icons';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: SparkleIcon },
  { href: '/admin/orders', label: 'Orders', icon: TruckIcon },
  { href: '/admin/products', label: 'Products', icon: BagIcon },
  { href: '/admin/customers', label: 'Customers', icon: UserIcon },
];

export function AdminNav() {
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
      {LINKS.map(({ href, label, icon: Icon }) => (
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
        <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Store admin
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
              Minah & Co
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              Store administration
            </p>
          </div>
          {nav}
        </div>

        <div className="space-y-1">
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
