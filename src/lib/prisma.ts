import { PrismaClient } from '@prisma/client';

/**
 * The storefront is designed to run with or without a database:
 *
 *   DATABASE_URL set    → Postgres is the source of truth (admin CRUD, orders).
 *   DATABASE_URL unset  → read-only fallback to the bundled catalog, so `npm run
 *                         dev` and Vercel preview builds work with zero setup.
 *
 * `hasDatabase` is what the repo layer branches on.
 */
export const hasDatabase = Boolean(process.env.DATABASE_URL);

/**
 * Neon (and most serverless Postgres providers) hand you a *pooled* connection
 * string whose host contains `-pooler`. That endpoint runs PgBouncer in
 * transaction mode, where Prisma's prepared statements break with errors like
 * "prepared statement s0 already exists".
 *
 * Prisma's documented fix is `?pgbouncer=true&connection_limit=1` on the URL —
 * but the connection string is injected by the Vercel integration, so editing it
 * by hand gets overwritten on the next sync. Normalising it here instead means
 * it is correct no matter what the integration sets.
 */
export function normalizeConnectionUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (!url.host.includes('-pooler')) return raw;

    if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');

    if (!url.searchParams.has('connection_limit')) {
      /*
        One connection is right at runtime: each serverless invocation gets its
        own client and handles one request, so a bigger pool just exhausts the
        pooler under load.

        It is wrong during a build. Next prerenders every product page
        concurrently inside a single Node process, and with a pool of one they
        queue behind each other until they time out — at which point the repo
        layer quietly falls back to the bundled catalogue and bakes stale data
        into the static pages. Nothing fails loudly; the pages are just wrong.
      */
      /*
        A pool of one is right only where each request gets its own process, as
        on Vercel. On a single long-running server six concurrent checkouts
        queue behind one connection and time out — which the repo layer then
        reports as a database hiccup rather than the self-inflicted contention
        it is.
      */
      const serverless = Boolean(process.env.VERCEL) && !isBuildPhase();
      url.searchParams.set('connection_limit', serverless ? '1' : '10');
      if (!serverless) url.searchParams.set('pool_timeout', '30');
    }

    return url.toString();
  } catch {
    // Not a parseable URL — hand it to Prisma untouched and let it complain.
    return raw;
  }
}

/** True while `next build` is prerendering, on Vercel and locally alike. */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: normalizeConnectionUrl(process.env.DATABASE_URL!),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient | null = hasDatabase
  ? (globalForPrisma.prisma ?? createClient())
  : null;

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

/** Narrowing helper — throws where a route genuinely cannot work without a DB. */
export function requireDb(): PrismaClient {
  if (!prisma) {
    throw new Error(
      'This action requires a database. Set DATABASE_URL and run `npm run db:push && npm run db:seed`.',
    );
  }
  return prisma;
}
