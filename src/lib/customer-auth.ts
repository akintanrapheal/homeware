import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';

/**
 * Customer accounts. Deliberately dependency-free: scrypt is in Node's standard
 * library and is a memory-hard KDF, so it does the job bcrypt/argon2 would
 * without a native module to compile on every Vercel build.
 *
 * Accounts are optional throughout — guest checkout remains a first-class path
 * and must never be gated behind this.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const CUSTOMER_COOKIE = 'mls_customer';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const CUSTOMER_SESSION_MAX_AGE = SESSION_TTL_MS / 1000;
const KEY_LENGTH = 64;

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'minah-luxe-development-secret-do-not-use-in-production'
  );
}

/** Stored as `salt:derivedKey`, both hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;

  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(key, 'hex');
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false.
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

/** `customerId.expiry.signature` — stateless, so no session table to sweep. */
export function createCustomerToken(customerId: string): string {
  const payload = `${customerId}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the customer id, or null if absent, malformed, expired or forged. */
export function readCustomerToken(token: string | undefined): string | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [customerId, expires, signature] = parts;
  if (!customerId || !expires || !signature) return null;
  if (Number(expires) < Date.now()) return null;

  const expected = sign(`${customerId}.${expires}`);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return customerId;
}

/** Current customer id from the request cookie, if signed in. */
export async function getCustomerId(): Promise<string | null> {
  const store = await cookies();
  return readCustomerToken(store.get(CUSTOMER_COOKIE)?.value);
}
