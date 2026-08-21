import { NextResponse } from 'next/server';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

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
  artShape: z.string().trim().max(40).nullable().optional(),
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

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!can(session?.role, 'products.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
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
    const before = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.product.update({ where: { id }, data });

    // Price and stock are the fields anyone ever asks about afterwards.
    const changes: string[] = [];
    if (before && data.price !== undefined && before.price !== data.price) {
      changes.push(`price ${before.price} → ${data.price}`);
    }
    if (before && data.stock !== undefined && before.stock !== data.stock) {
      changes.push(`stock ${before.stock} → ${data.stock}`);
    }
    if (before && data.compareAt !== undefined && before.compareAt !== data.compareAt) {
      changes.push(`was-price ${before.compareAt ?? 'none'} → ${data.compareAt ?? 'none'}`);
    }
    await audit('product.update', `${product.name}: ${changes.join(', ') || 'details edited'}`, {
      target: product.slug,
    });

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!can(session?.role, 'products.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const { id } = await params;
  try {
    const doomed = await prisma.product.findUnique({ where: { id } });
    await prisma.product.delete({ where: { id } });
    await audit('product.delete', `Deleted ${doomed?.name ?? id}`, { target: doomed?.slug });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}
