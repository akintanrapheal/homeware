import { hasDatabase, prisma } from './prisma';
import { STORE, DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD, toWhatsAppNumber } from './config';

/**
 * Settings resolve in three layers, most specific first:
 *
 *   1. the database row, edited in the admin
 *   2. environment variables
 *   3. the compiled defaults in config.ts
 *
 * That order means a fresh install works with no configuration, an operator can
 * change the shop without a deploy, and anything they leave blank quietly falls
 * back rather than rendering an empty storefront.
 */

export interface ResolvedSettings {
  storeName: string;
  tagline: string;
  description: string;
  whatsapp: string;
  email: string;
  phone: string;
  instagram: string;
  tiktok: string;
  address: string;
  hours: string;
  announcement: string;
  freeDeliveryThreshold: number;
  paystackEnabled: boolean;
  paystackPublicKey: string | null;
  emailOnOrder: boolean;
  notifyStore: boolean;
}

export interface DeliveryZone {
  id: string;
  label: string;
  fee: number;
}

const pick = (...values: (string | null | undefined)[]) =>
  values.find((v) => typeof v === 'string' && v.trim() !== '')?.trim() ?? '';

/** Public settings — safe to render. Never includes a secret. */
export async function getSettings(): Promise<ResolvedSettings> {
  const fallback: ResolvedSettings = {
    storeName: STORE.name,
    tagline: STORE.tagline,
    description: STORE.description,
    whatsapp: STORE.whatsapp,
    email: STORE.email,
    phone: STORE.phone,
    instagram: STORE.instagram,
    tiktok: STORE.tiktok,
    address: STORE.address,
    hours: STORE.hours,
    announcement: '',
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    paystackEnabled: Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY),
    paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? null,
    emailOnOrder: true,
    notifyStore: true,
  };

  if (!hasDatabase || !prisma) return fallback;

  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
    if (!row) return fallback;

    return {
      storeName: pick(row.storeName, fallback.storeName),
      tagline: pick(row.tagline, fallback.tagline),
      description: pick(row.description, fallback.description),
      whatsapp: toWhatsAppNumber(pick(row.whatsapp, fallback.whatsapp)),
      email: pick(row.email, fallback.email),
      phone: pick(row.phone, fallback.phone),
      instagram: pick(row.instagram, fallback.instagram),
      tiktok: pick(row.tiktok, fallback.tiktok),
      address: pick(row.address, fallback.address),
      hours: pick(row.hours, fallback.hours),
      announcement: row.announcement ?? '',
      freeDeliveryThreshold: row.freeDeliveryThreshold || fallback.freeDeliveryThreshold,
      // Enabled only when a key actually exists — a checkbox on its own would
      // offer card payment that then fails at the point of paying.
      paystackEnabled: row.paystackEnabled && Boolean(row.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY),
      paystackPublicKey: pick(row.paystackPublicKey, fallback.paystackPublicKey) || null,
      emailOnOrder: row.emailOnOrder,
      notifyStore: row.notifyStore,
    };
  } catch (error) {
    console.error('[settings] read failed, using defaults', error);
    return fallback;
  }
}

/** Server-only secrets. Must never reach a client component. */
export async function getSecrets(): Promise<{
  paystackSecretKey: string | null;
  emailApiKey: string | null;
  emailFrom: string | null;
  emailReplyTo: string | null;
}> {
  const fallback = {
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? null,
    emailApiKey: process.env.RESEND_API_KEY ?? null,
    emailFrom: process.env.EMAIL_FROM ?? null,
    emailReplyTo: process.env.EMAIL_REPLY_TO ?? null,
  };

  if (!hasDatabase || !prisma) return fallback;

  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 'singleton' } });
    if (!row) return fallback;
    return {
      paystackSecretKey: pick(row.paystackSecretKey, fallback.paystackSecretKey) || null,
      emailApiKey: pick(row.emailApiKey, fallback.emailApiKey) || null,
      emailFrom: pick(row.emailFrom, fallback.emailFrom) || null,
      emailReplyTo: pick(row.emailReplyTo, fallback.emailReplyTo) || null,
    };
  } catch {
    return fallback;
  }
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  if (!hasDatabase || !prisma) {
    return DELIVERY_ZONES.map((z) => ({ id: z.id, label: z.label, fee: z.fee }));
  }

  try {
    const rows = await prisma.deliveryZoneRow.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    if (rows.length === 0) {
      return DELIVERY_ZONES.map((z) => ({ id: z.id, label: z.label, fee: z.fee }));
    }
    return rows.map((r) => ({ id: r.slug, label: r.label, fee: r.fee }));
  } catch (error) {
    console.error('[settings] delivery zones failed, using defaults', error);
    return DELIVERY_ZONES.map((z) => ({ id: z.id, label: z.label, fee: z.fee }));
  }
}

/**
 * Resolves the fee for a zone. Unknown zones are rejected by returning null so
 * the caller can refuse the order — quietly charging a default would let a
 * tampered request pick its own delivery price.
 */
export async function resolveDeliveryFee(
  zoneId: string,
  subtotal: number,
): Promise<{ zone: DeliveryZone; fee: number } | null> {
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) return null;

  const fee = subtotal >= settings.freeDeliveryThreshold ? 0 : zone.fee;
  return { zone, fee };
}
