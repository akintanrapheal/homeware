import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const productSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().max(80).default('Homeware & Co'),
  category: z.string().trim().min(2).max(40),
  family: z.string().trim().min(2).max(40),
  description: z.string().trim().min(10).max(2000),
  specs: z.array(z.string().trim().max(160)).max(16).default([]),
  care: z.array(z.string().trim().max(160)).max(16).default([]),
  inBox: z.array(z.string().trim().max(160)).max(16).default([]),
  sizeLabel: z.string().trim().max(60).nullable().default(null),
  price: z.number().int().min(100).max(100_000_000),
  compareAt: z.number().int().min(0).max(100_000_000).nullable().default(null),
  stock: z.number().int().min(0).max(100000).default(0),
  imageUrl: z.string().trim().url().max(600).nullable().or(z.literal('')).default(null),
  accent: z.enum(['clay', 'sage', 'sand', 'slate', 'copper', 'ink']).default('clay'),
  featured: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(4.8),
  reviewCount: z.number().int().min(0).max(1_000_000).default(0),
});

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Check the product fields',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = { ...parsed.data, imageUrl: parsed.data.imageUrl || null };

  try {
    const product = await prisma.product.create({ data });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'A product with that slug already exists'
        : 'Could not create the product';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
