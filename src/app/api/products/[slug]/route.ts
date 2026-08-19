import { NextResponse } from 'next/server';
import { getProductBySlug, getRelatedProducts } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const related = await getRelatedProducts(product, 4);
  return NextResponse.json({ product, related });
}
