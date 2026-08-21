import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { hasDatabase, prisma } from './prisma';

/**
 * Staff authentication, roles and permissions.
 *
 * Passwords use scrypt from Node's standard library — memory-hard, and no
 * native module to compile on every deploy. Sessions are HMAC-signed cookies
 * carrying the user id, so there is no session table to sweep, and suspending
 * an account takes effect on the next request because the role and suspension
 * are read fresh rather than baked into the token.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const ADMIN_COOKIE = 'mls_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
export const ADMIN_SESSION_MAX_AGE = SESSION_TTL_MS / 1000;

import { can, permissionsFor, type Permission, type Role } from './roles';

// Re-exported so callers need only one import for auth and authorisation.
export { ROLES, can, permissionsFor } from './roles';
export type { Role, Permission } from './roles';

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/* ------------------------------------------------------------------ passwords */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

/* ------------------------------------------------------------------- sessions */

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'minah-luxe-development-secret-do-not-use-in-production'
  );
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSessionToken(adminUserId: string): string {
  const payload = `${adminUserId}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id, or null if absent, malformed, expired or forged. */
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [id, expires, signature] = parts;
  if (!id || !expires || !signature) return null;
  if (Number(expires) < Date.now()) return null;

  const expected = sign(`${id}.${expires}`);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return id;
}

/**
 * The signed-in staff member, or null.
 *
 * Reads the role and suspension from the database on every call rather than
 * trusting the cookie: revoking access has to take effect now, not in twelve
 * hours when the session happens to expire.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasDatabase || !prisma) return null;

  const store = await cookies();
  const id = readSessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!id) return null;

  try {
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, suspended: true },
    });
    if (!user || user.suspended) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
  } catch {
    return null;
  }
}

/** True when anyone is signed in at all — for pages every role can open. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await getAdminSession();
  return can(session?.role, permission);
}

/* ------------------------------------------------------------------ bootstrap */

/**
 * True when no staff account exists yet.
 *
 * The very first account is created from the login screen using ADMIN_PASSWORD
 * as proof of authority — the shop already trusts whoever holds that. Without
 * this a fresh deployment has a login form and no possible way to get in.
 */
export async function needsBootstrap(): Promise<boolean> {
  if (!hasDatabase || !prisma) return false;
  try {
    return (await prisma.adminUser.count()) === 0;
  } catch {
    return false;
  }
}

/** Constant-time comparison against the bootstrap secret. */
export function checkBootstrapSecret(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
