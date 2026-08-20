import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Every field optional — the products table sends single-field edits, while the
 * full editor sends the whole record. Category is a free slug rather than an
 * enum now that categories are managed in the admin.
 */
const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens')
    .optional(),
  brand: z.string().trim().max(80).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  family: z.string().trim().min(2).max(40).optional(),
  sizeLabel: z.string().trim().max(60).nullable().optional(),
  specs: z.array(z.string().trim().max(160)).max(16).optional(),
  care: z.array(z.string().trim().max(160)).max(16).optional(),
  inBox: z.array(z.string().trim().max(160)).max(16).optional(),
  price: z.number().int().min(100).max(100_000_000).optional(),
  compareAt: z.number().int().min(0).max(100_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  imageUrl: z.string().trim().max(600).nullable().optional(),
  accent: z.enum(['clay', 'sage', 'sand', 'slate', 'copper', 'ink']).optional(),
  featured: z.boolean().optional(),
  bestseller: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).max(1_000_000).optional(),
  category: z.string().trim().min(2).max(40).optional(),
});

/** GET — one product, for the editor to load. */
export async function GET(
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
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ product });
}

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

  const data = { ...parsed.data };
  if (data.imageUrl === '') data.imageUrl = null;

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}

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
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}
