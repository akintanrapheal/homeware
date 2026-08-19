import { PrismaClient } from '@prisma/client';
import { CATALOG } from '../src/lib/catalog';

const prisma = new PrismaClient();

/**
 * Idempotent seed — upserts by slug, so running it again after editing
 * src/lib/catalog.ts syncs your changes without wiping orders.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to .env before seeding.');
  }

  console.log(`Seeding ${CATALOG.length} products…`);

  for (const product of CATALOG) {
    // `id` is intentionally omitted: Postgres generates its own cuid, and the
    // seed-* ids in the catalog only exist to identify fallback rows.
    const { id: _seedId, ...data } = product;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: data,
    });
    console.log(`  ✓ ${product.name}`);
  }

  const count = await prisma.product.count();
  console.log(`\nDone. ${count} products in the database.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
