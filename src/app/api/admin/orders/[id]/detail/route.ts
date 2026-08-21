import { NextResponse } from 'next/server';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/orders/:id/detail — one order, everything needed to pack it.
 *
 * Order items store a name and price snapshot taken at purchase, which is what
 * should be honoured. The live product is joined in only for its photo and
 * current stock, so the packer can see what they are reaching for without the
 * order's own figures being rewritten by a later price change.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!can(session?.role, 'orders.view')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const { id } = await params;

  // Accept either the database id or the human reference, so a reference read
  // off a WhatsApp message can be pasted straight into the URL.
  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { reference: id.toUpperCase() }] },
    include: { items: true, customer: { select: { id: true, name: true, email: true, phone: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const slugs = order.items.map((i) => i.slug);
  const products = slugs.length
    ? await prisma.product.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true, imageUrl: true, category: true, accent: true, stock: true, price: true },
      })
    : [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const items = order.items.map((i) => {
    const live = bySlug.get(i.slug);
    return {
      ...i,
      imageUrl: live?.imageUrl ?? null,
      category: live?.category ?? 'cookware',
      accent: live?.accent ?? 'clay',
      currentStock: live?.stock ?? null,
      /** True when the catalogue price has moved since the order was placed. */
      priceChanged: live ? live.price !== i.price : false,
      currentPrice: live?.price ?? null,
      stillListed: Boolean(live),
    };
  });

  return NextResponse.json({ order: { ...order, items } });
}
