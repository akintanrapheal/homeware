'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppIcon } from './icons';
import { buildEnquiryLink } from '@/lib/whatsapp';

/**
 * Persistent chat affordance. Hidden on checkout, where a floating button
 * competes with the pay action, and inside the admin area.
 */
export function WhatsAppFloat() {
  const pathname = usePathname();
  if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return null;

  return (
    <a
      href={buildEnquiryLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-4 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3.5 text-ink-900 shadow-[0_12px_34px_-10px_rgba(37,211,102,0.7)] transition-transform duration-300 hover:scale-105 active:scale-95 sm:bottom-7 sm:right-7"
    >
      <WhatsAppIcon width={22} height={22} />
      <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.16em] sm:inline">
        Chat with us
      </span>
    </a>
  );
}
