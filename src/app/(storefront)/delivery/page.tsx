import Link from 'next/link';
import type { Metadata } from 'next';
import { Reveal } from '@/components/reveal';
import { ShieldIcon, TruckIcon, WhatsAppIcon } from '@/components/icons';
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD, STORE } from '@/lib/config';
import { formatNaira } from '@/lib/format';
import { buildEnquiryLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Delivery & returns',
  description:
    'Homeware & Co delivery rates across Nigeria, dispatch times, and our seven-day return and two-year guarantee policy.',
};

export default function DeliveryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
      <Reveal as="header" className="mb-12">
        <p className="eyebrow mb-4">Delivery &amp; returns</p>
        <h1 className="font-display text-5xl font-light leading-tight text-ink-900 sm:text-6xl">
          Getting it to <span className="italic text-clay-600">your door</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600">
          Flat rates by zone, free above {formatNaira(FREE_DELIVERY_THRESHOLD)}, and a WhatsApp
          message the moment your order leaves us.
        </p>
      </Reveal>

      <Reveal className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-paper-200 px-6 py-5">
          <TruckIcon width={20} height={20} className="text-clay-500" />
          <h2 className="font-display text-2xl font-light text-ink-900">Rates by zone</h2>
        </div>
        <ul className="divide-y divide-paper-200">
          {DELIVERY_ZONES.map((zone) => (
            <li key={zone.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <span className="text-sm text-ink-700">{zone.label}</span>
              <span className="shrink-0 text-sm text-clay-600">
                {zone.fee === 0 ? 'Free' : formatNaira(zone.fee)}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-paper-200 px-6 py-4 text-xs leading-relaxed text-ink-500">
          Orders of {formatNaira(FREE_DELIVERY_THRESHOLD)} and above ship free to any zone. Rates are
          calculated automatically at checkout.
        </p>
      </Reveal>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Reveal delay={80}>
          <div className="card h-full p-6 sm:p-7">
            <h3 className="font-display text-2xl font-light text-ink-900">Dispatch times</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-600">
              <li>
                <span className="text-ink-900">Lagos:</span> same day for orders confirmed before
                3pm WAT, next morning after that.
              </li>
              <li>
                <span className="text-ink-900">Abuja &amp; South West:</span> 1–2 working days.
              </li>
              <li>
                <span className="text-ink-900">Rest of Nigeria:</span> 2–3 working days.
              </li>
              <li>
                <span className="text-ink-900">Pickup:</span> ready within two hours at our Lekki
                store, {STORE.hours}.
              </li>
            </ul>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="card h-full p-6 sm:p-7">
            <ShieldIcon width={22} height={22} className="mb-4 text-clay-500" />
            <h3 className="font-display text-2xl font-light text-ink-900">Returns</h3>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              If a product arrives damaged, is not what you ordered, or is not as described, message
              us within seven days with a photo and we will replace it or refund you in full —
              return shipping on us.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Unused items in original packaging can be returned within seven days for any reason. Once
              cookware has been used on a flame we can only replace it under the guarantee, not
              take it back on preference.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={180} className="mt-10 text-center">
        <p className="text-sm text-ink-600">
          Anything unclear? Ask before you order — we would rather explain twice than disappoint
          once.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={buildEnquiryLink('Hello! I have a question about delivery.')}
            target="_blank"
            rel="noreferrer"
            className="btn btn-clay"
          >
            <WhatsAppIcon width={16} height={16} />
            Ask on WhatsApp
          </a>
          <Link href="/shop" className="btn btn-outline">
            Back to the shop
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
