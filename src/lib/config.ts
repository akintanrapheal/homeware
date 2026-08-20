/**
 * wa.me accepts digits only — a "+", a space or a dash silently produces a dead
 * link. Normalise whatever is configured so any plausible input works:
 *
 *   "+234 906 657 9857" → "2349066579857"
 *   "0906 657 9857"     → "2349066579857"   (Nigerian local form)
 */
export function toWhatsAppNumber(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `234${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Every piece of store identity lives here so a rebrand or a phone-number
 * change is one edit (or one Vercel env var), never a search-and-replace.
 */
export const STORE = {
  name: 'Homeware & Co',
  shortName: 'Homeware & Co',
  tagline: 'For the home you actually live in.',
  description:
    'Homeware & Co — cookware, tableware, glassware, knives and kitchen storage chosen to be used every day. Honest pricing, proper materials, delivered across Nigeria.',
  whatsapp: toWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '09060237909'),
  email: process.env.NEXT_PUBLIC_STORE_EMAIL || 'hello@homewareandco.com',
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || '+234 906 023 7909',
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM || 'https://instagram.com/homewareandco',
  tiktok: process.env.NEXT_PUBLIC_TIKTOK || 'https://tiktok.com/@homewareandco',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://homeware-ten.vercel.app',
  address: 'Lekki Phase 1, Lagos, Nigeria',
  hours: 'Mon – Sat, 9am – 6pm WAT',
} as const;

/** Flat delivery fees in Naira, keyed by the zone chosen at checkout. */
export const DELIVERY_ZONES: { id: string; label: string; fee: number }[] = [
  { id: 'lagos-island', label: 'Lagos — Island', fee: 3500 },
  { id: 'lagos-mainland', label: 'Lagos — Mainland', fee: 4000 },
  { id: 'abuja', label: 'Abuja (FCT)', fee: 6000 },
  { id: 'south-west', label: 'South West (Oyo, Ogun, Osun, Ondo, Ekiti)', fee: 6500 },
  { id: 'south-south', label: 'South South (Rivers, Delta, Edo, Akwa Ibom…)', fee: 7000 },
  { id: 'south-east', label: 'South East (Anambra, Enugu, Imo, Abia, Ebonyi)', fee: 7000 },
  { id: 'north', label: 'Northern States', fee: 8000 },
  { id: 'pickup', label: 'Pick up at our Lekki showroom', fee: 0 },
];

/**
 * Higher than a fragrance shop's would be: cookware is heavy, and the courier
 * cost on a cast-iron pot is not the cost on a bottle.
 */
export const FREE_DELIVERY_THRESHOLD = 120000;

export function deliveryFeeFor(zoneId: string, subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return DELIVERY_ZONES.find((z) => z.id === zoneId)?.fee ?? 4500;
}
