import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SHAPES = ['cookware', 'knives', 'appliances', 'storage', 'tableware', 'glassware', 'textiles'] as const;

const patchSchema = z.object({
  label: z.string().trim().min(2).max(60).optional(),
  blurb: z.string().trim().max(200).optional(),
  group: z.string().trim().min(2).max(40).optional(),
  shape: z.enum(SHAPES).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid update' },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
}

/**
 * DELETE — refuses while products still reference the slug.
 *
 * Deleting anyway would leave stock filed under a category the shop no longer
 * lists, which is how products silently disappear from a storefront. Reassign
 * first, or hide the category instead.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const inUse = await prisma.product.count({ where: { category: category.slug } });
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `${inUse === 1 ? '1 product still uses' : `${inUse} products still use`} “${category.label}”. Move ${inUse === 1 ? 'it' : 'them'} to another category first, or hide this one instead of deleting it.`,
      },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
