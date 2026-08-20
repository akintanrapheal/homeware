import { hasDatabase, prisma } from './prisma';

/**
 * Fixed-window rate limiting, backed by the database.
 *
 * In-memory counters are useless here: each serverless invocation is its own
 * process, so an attacker spreading requests across instances would never meet
 * the same counter twice. The database is the only thing they all share.
 *
 * Fails open. If the limiter itself is broken, that must not stop people
 * checking out — the limiter exists to slow abuse, not to gate the shop.
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Best-effort client identity. Behind Vercel, x-forwarded-for is set. */
export function identify(request: Request, extra?: string): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return extra ? `${ip}:${extra.toLowerCase()}` : ip;
}

export async function rateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const allow: RateLimitResult = { ok: true, remaining: limit, retryAfterSeconds: 0 };
  if (!hasDatabase || !prisma) return allow;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const existing = await prisma.rateLimit.findUnique({
      where: { bucket_identity: { bucket, identity } },
    });

    // No window, or the previous one has lapsed: start a fresh one.
    if (!existing || existing.expiresAt <= now) {
      await prisma.rateLimit.upsert({
        where: { bucket_identity: { bucket, identity } },
        create: { bucket, identity, count: 1, expiresAt },
        update: { count: 1, expiresAt },
      });
      return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)),
      };
    }

    const updated = await prisma.rateLimit.update({
      where: { bucket_identity: { bucket, identity } },
      data: { count: { increment: 1 } },
    });

    return { ok: true, remaining: Math.max(0, limit - updated.count), retryAfterSeconds: 0 };
  } catch (error) {
    console.error('[rate-limit] check failed, allowing request', error);
    return allow;
  }
}

/** 429 with the headers a well-behaved client will honour. */
export function tooManyRequests(result: RateLimitResult, message?: string): Response {
  return new Response(
    JSON.stringify({
      error:
        message ??
        `Too many attempts. Please wait ${result.retryAfterSeconds} seconds and try again.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds),
      },
    },
  );
}

/**
 * Housekeeping. Called opportunistically rather than on a schedule — expired
 * rows are harmless, they just accumulate.
 */
export async function pruneRateLimits(): Promise<void> {
  if (!hasDatabase || !prisma) return;
  try {
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {
    /* housekeeping only */
  }
}
