import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  productSlug: z.string().trim().max(120).optional().nullable(),
  author: z.string().trim().min(2, 'Please give your name').max(80),
  city: z.string().trim().max(60).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10, 'Tell us a little more').max(1200),
});

/**
 * POST /api/reviews — a customer leaving a review.
 *
 * Arrives unapproved and stays invisible until the shop says otherwise. An
 * open review form that publishes instantly is a spam target, and the first
 * the owner would know is a customer asking about it.
 */
export async function POST(request: Request) {
  const limit = await rateLimit('reviews', identify(request), 3, 900);
  if (!limit.ok) return tooManyRequests(limit);

  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'Reviews need a database connection' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form' },
      { status: 400 },
    );
  }

  const { productSlug, author, city, rating, body } = parsed.data;

  // Resolve the slug here rather than trusting an id from the browser.
  let productId: string | null = null;
  if (productSlug) {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug },
      select: { id: true },
    });
    productId = product?.id ?? null;
  }

  await prisma.review.create({
    data: {
      productId,
      author,
      city: city ?? '',
      rating,
      body,
      approved: false,
      source: 'storefront',
    },
  });

  return NextResponse.json({
    message: 'Thank you — your review has been sent to us and will appear once checked.',
  });
}
