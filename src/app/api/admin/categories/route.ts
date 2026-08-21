import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { CATEGORIES_TAG } from '@/lib/settings';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SHAPES = ['cookware', 'knives', 'appliances', 'storage', 'tableware', 'glassware', 'textiles'] as const;

const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  label: z.string().trim().min(2).max(60),
  blurb: z.string().trim().max(200).default(''),
  group: z.string().trim().min(2).max(40).default('kitchen'),
  shape: z.enum(SHAPES).default('cookware'),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

/** GET — every category including hidden ones, plus how many products use each. */
export async function GET() {
  const session = await getAdminSession();
  if (!can(session?.role, 'products.view')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] }),
    prisma.product.groupBy({ by: ['category'], _count: { _all: true } }),
  ]);

  const byCategory = counts.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = row._count._all;
    return acc;
  }, {});

  // Products can point at a slug with no category row — after a rename, say.
  // Surfacing them beats letting stock quietly vanish from the shop nav.
  const known = new Set(categories.map((c) => c.slug));
  const orphans = Object.entries(byCategory)
    .filter(([slug]) => !known.has(slug))
    .map(([slug, count]) => ({ slug, count }));

  return NextResponse.json({
    categories: categories.map((c) => ({ ...c, productCount: byCategory[c.slug] ?? 0 })),
    orphans,
    shapes: SHAPES,
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'categories.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the category fields' },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.create({ data: parsed.data });
    revalidateTag(CATEGORIES_TAG);
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A category with that slug already exists' }, { status: 409 });
  }
}
