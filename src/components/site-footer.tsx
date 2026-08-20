import Link from 'next/link';
import { NewsletterForm } from './newsletter-form';
import { InstagramIcon, MailIcon, PhoneIcon, PinIcon, TikTokIcon, WhatsAppIcon } from './icons';
import { STORE } from '@/lib/config';
import { getCategories } from '@/lib/repo';

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const categories = await getCategories();

  return (
    <footer className="relative overflow-hidden border-t border-paper-200 bg-paper-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-clay-100 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="inline-block">
              <span className="block font-display text-2xl font-light tracking-[0.18em] text-ink-900">
                HOMEWARE
              </span>
              <span className="eyebrow block text-[0.55rem]">& Co</span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-600">
              Cookware, knives and tableware for kitchens that get used. Chosen with care, priced
              honestly, delivered anywhere in Nigeria.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={`https://wa.me/${STORE.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="rounded-full border border-paper-300 p-2.5 text-ink-600 transition hover:border-clay-500 hover:text-clay-600"
              >
                <WhatsAppIcon width={17} height={17} />
              </a>
              <a
                href={STORE.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="rounded-full border border-paper-300 p-2.5 text-ink-600 transition hover:border-clay-500 hover:text-clay-600"
              >
                <InstagramIcon width={17} height={17} />
              </a>
              <a
                href={STORE.tiktok}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="rounded-full border border-paper-300 p-2.5 text-ink-600 transition hover:border-clay-500 hover:text-clay-600"
              >
                <TikTokIcon width={17} height={17} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="eyebrow mb-5">Shop</h3>
            <ul className="space-y-3">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop?category=${c.id}`}
                    className="text-sm text-ink-600 transition-colors hover:text-clay-600"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-5">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-ink-600 transition-colors hover:text-clay-600">
                  Our story
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-ink-600 transition-colors hover:text-clay-600">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="text-sm text-ink-600 transition-colors hover:text-clay-600">
                  Delivery &amp; returns
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-sm text-ink-600 transition-colors hover:text-clay-600">
                  All products
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-sm text-ink-500 transition-colors hover:text-clay-600">
                  Store admin
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-5">The List</h3>
            <p className="mb-5 text-sm leading-relaxed text-ink-600">
              New arrivals, restocks and subscriber-only prices. No spam — one note a month.
            </p>
            <NewsletterForm compact />

            <ul className="mt-7 space-y-3 text-sm text-ink-600">
              <li className="flex items-center gap-2.5">
                <PhoneIcon width={15} height={15} className="shrink-0 text-clay-500" />
                <a href={`tel:${STORE.phone.replace(/\s/g, '')}`} className="hover:text-clay-600">
                  {STORE.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MailIcon width={15} height={15} className="shrink-0 text-clay-500" />
                <a href={`mailto:${STORE.email}`} className="hover:text-clay-600">
                  {STORE.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <PinIcon width={15} height={15} className="shrink-0 text-clay-500" />
                {STORE.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="rule my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-ink-500 sm:flex-row">
          <p>
            © {year} {STORE.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-4">
            <span>Secured by Paystack</span>
            <span aria-hidden>·</span>
            <span>{STORE.hours}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
