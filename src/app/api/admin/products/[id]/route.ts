import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Every field optional — the dashboard sends only what changed. */
const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  price: z.number().int().min(100).max(100_000_000).optional(),
  compareAt: z.number().int().min(0).max(100_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  imageUrl: z.string().trim().max(600).nullable().optional(),
  accent: z.enum(['clay', 'sage', 'sand', 'slate', 'copper', 'ink']).optional(),
  featured: z.boolean().optional(),
  bestseller: z.boolean().optional(),
  category: z
    .enum(['cookware', 'knives', 'appliances', 'storage', 'tableware', 'glassware', 'textiles'])
    .optional(),
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
