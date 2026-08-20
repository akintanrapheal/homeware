'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useCart } from './cart-provider';
import { useAccount } from './account-provider';
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './icons';
import { CATEGORIES, type CategoryMeta } from '@/lib/types';
import { STORE } from '@/lib/config';

const NAV = [
  { href: '/shop', label: 'Shop All' },
  { href: '/shop?category=cookware', label: 'Cookware' },
  { href: '/shop?category=knives', label: 'Knives' },
  { href: '/shop?category=tableware', label: 'Tableware' },
  { href: '/about', label: 'Our Story' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader({
  categories,
  announcement,
}: {
  categories?: CategoryMeta[];
  announcement?: string;
}) {
  const cats = categories?.length ? categories : CATEGORIES;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const { count, open, ready } = useCart();
  const { customer } = useAccount();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /**
   * Closes the overlays when the route changes.
   *
   * This alone is not enough for the mobile drawer: its category links go to
   * /shop?category=oils, so moving between categories changes only the query
   * string and usePathname() returns "/shop" both times — the effect never
   * fires and the drawer stays open over the results.
   *
   * Watching useSearchParams() would fix it, but this header renders in the
   * root layout, and reading search params there opts every page in the app out
   * of static rendering. The drawer's links close it explicitly via closeMenu
   * instead; this effect stays as the backstop for browser back/forward.
   */
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    setSearchOpen(false);
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  }

  return (
    <>
      <div className="bg-paper-100 text-center text-[0.66rem] tracking-[0.28em] uppercase text-clay-600/90 py-2 px-4">
        {announcement?.trim() || 'Free delivery on orders over ₦120,000 · Nationwide'}
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-paper-50/90 backdrop-blur-xl border-b border-paper-200'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="tap -ml-2 shrink-0 text-ink-800 transition hover:text-clay-600 lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon width={22} height={22} />
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.slice(0, 4).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="relative text-[0.7rem] uppercase tracking-[0.2em] text-ink-700 transition-colors hover:text-clay-600 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-clay-500 after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/*
            In normal flow, never absolutely positioned. Centring the wordmark
            over the viewport put it underneath the icon row on narrow screens —
            flex-1 lets it take the space that is actually free instead.
          */}
          <Link
            href="/"
            className="min-w-0 flex-1 text-center leading-none lg:flex-none"
            aria-label={`${STORE.name} home`}
          >
            <span className="block font-display text-lg font-light tracking-[0.12em] text-ink-900 sm:text-2xl sm:tracking-[0.18em]">
              HOMEWARE
            </span>
            <span className="eyebrow block text-[0.48rem] sm:text-[0.55rem]">
              &amp; Co
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.slice(4).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="relative text-[0.7rem] uppercase tracking-[0.2em] text-ink-700 transition-colors hover:text-clay-600 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-clay-500 after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="tap text-ink-800 transition hover:text-clay-600"
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <SearchIcon width={20} height={20} />
            </button>
            <Link
              href={customer ? '/account' : '/account/login'}
              className="tap hidden text-ink-800 transition hover:text-clay-600 sm:inline-flex"
              aria-label={customer ? 'Your account' : 'Sign in'}
              title={customer ? customer.name : 'Sign in'}
            >
              <UserIcon width={20} height={20} />
            </Link>
            <button
              type="button"
              onClick={open}
              className="tap relative -mr-2 text-ink-800 transition hover:text-clay-600"
              aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <BagIcon width={21} height={21} />
              {ready && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-clay-600 px-1 text-[0.6rem] font-semibold text-paper-50">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search drawer */}
        <div
          className={`overflow-hidden border-paper-200 transition-all duration-400 ${
            searchOpen ? 'max-h-24 border-t' : 'max-h-0'
          }`}
        >
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6"
          >
            <SearchIcon className="shrink-0 text-clay-500" width={18} height={18} />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search pans, knives, storage…"
              className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none"
              aria-label="Search products"
            />
            <button type="submit" className="eyebrow shrink-0 hover:text-clay-700">
              Go
            </button>
          </form>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
        /*
          `inert` rather than `aria-hidden`: the closed drawer still contains
          links, so aria-hidden alone left them reachable by Tab (and putting
          aria-hidden over focusable content is itself an ARIA violation).
          inert removes them from the tab order and the accessibility tree.
        */
        inert={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity duration-400 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-paper-200 px-6 py-5">
            <span className="font-display text-lg tracking-[0.18em] text-ink-900">HOMEWARE</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="tap -mr-2 text-ink-700 hover:text-clay-600"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-7">
            <p className="eyebrow mb-4">Kitchen</p>
            <ul className="mb-8 space-y-1">
              {cats.filter((c) => c.group === 'kitchen').map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop?category=${c.id}`}
                    onClick={closeMenu}
                    className="block py-2.5 font-display text-2xl font-light text-ink-800 transition-colors hover:text-clay-600"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="eyebrow mb-4">For the table</p>
            <ul className="mb-8 space-y-1">
              {cats.filter((c) => c.group !== 'kitchen').map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop?category=${c.id}`}
                    onClick={closeMenu}
                    className="block py-2.5 font-display text-2xl font-light text-ink-800 transition-colors hover:text-clay-600"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="rule my-6" />

            <ul className="space-y-3">
              <li>
                <Link href="/shop" onClick={closeMenu} className="text-sm tracking-wide text-ink-700 hover:text-clay-600">
                  Shop everything
                </Link>
              </li>
              <li>
                <Link href="/about" onClick={closeMenu} className="text-sm tracking-wide text-ink-700 hover:text-clay-600">
                  Our story
                </Link>
              </li>
              <li>
                <Link href="/contact" onClick={closeMenu} className="text-sm tracking-wide text-ink-700 hover:text-clay-600">
                  Contact &amp; delivery
                </Link>
              </li>
            </ul>
          </nav>

          <div className="space-y-3 border-t border-paper-200 p-6 pb-safe">
            <Link
              href={customer ? '/account' : '/account/login'}
              onClick={closeMenu}
              className="btn btn-outline w-full"
            >
              <UserIcon width={16} height={16} />
              {customer ? 'Your account' : 'Sign in / Register'}
            </Link>
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-clay w-full"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
