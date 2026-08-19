import { NextResponse } from 'next/server';
import { getProducts, getProductsBySlugs } from '@/lib/repo';
import type { CategoryId } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 *   ?slugs=a,b,c   → exact lookup (used to re-price the cart)
 *   ?category=&family=&q=&sort=&min=&max=&limit=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const slugsParam = searchParams.get('slugs');
  if (slugsParam) {
    const slugs = slugsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 60);
    const products = await getProductsBySlugs(slugs);
    return NextResponse.json({ products });
  }

  const limitParam = Number(searchParams.get('limit'));
  const minParam = Number(searchParams.get('min'));
  const maxParam = Number(searchParams.get('max'));

  const products = await getProducts({
    category: (searchParams.get('category') as CategoryId | 'all') ?? undefined,
    family: searchParams.get('family') ?? undefined,
    search: searchParams.get('q') ?? undefined,
    sort: (searchParams.get('sort') as 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating') ?? undefined,
    ...(Number.isFinite(minParam) && minParam > 0 ? { minPrice: minParam } : {}),
    ...(Number.isFinite(maxParam) && maxParam > 0 ? { maxPrice: maxParam } : {}),
    ...(Number.isFinite(limitParam) && limitParam > 0 ? { limit: Math.min(100, limitParam) } : {}),
  });

  return NextResponse.json({ products, count: products.length });
}
