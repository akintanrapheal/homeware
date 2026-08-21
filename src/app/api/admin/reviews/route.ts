import { NextResponse } from 'next/server';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createSchema = z.object({
  productSlug: z.string().trim().max(120).optional().nullable(),
  author: z.string().trim().min(2).max(80),
  city: z.string().trim().max(60).default(''),
  rating: z.number().int().min(1).max(5).default(5),
  body: z.string().trim().min(10).max(1200),
  approved: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'reviews.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const filter = new URL(request.url).searchParams.get('status');

  const reviews = await prisma.review.findMany({
    where:
      filter === 'pending' ? { approved: false } : filter === 'approved' ? { approved: true } : undefined,
    orderBy: [{ approved: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: { product: { select: { name: true, slug: true } } },
  });

  const pending = await prisma.review.count({ where: { approved: false } });
  const products = await prisma.product.findMany({
    select: { slug: true, name: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ reviews, pending, products });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'reviews.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the review fields' },
      { status: 400 },
    );
  }

  const { productSlug, ...rest } = parsed.data;
  let productId: string | null = null;
  if (productSlug) {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug },
      select: { id: true },
    });
    productId = product?.id ?? null;
  }

  const review = await prisma.review.create({ data: { ...rest, productId, source: 'admin' } });
  await audit('review.create', `Added review by ${review.author}`, { target: review.id });
  return NextResponse.json({ review }, { status: 201 });
}
