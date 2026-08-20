import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductsBySlugs } from '@/lib/repo';
import { hasDatabase, prisma } from '@/lib/prisma';
import { generateReference } from '@/lib/format';
import { DELIVERY_ZONES, deliveryFeeFor } from '@/lib/config';
import { buildOrderWhatsAppLink } from '@/lib/whatsapp';
import { getCustomerId } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

/** Thrown inside the order transaction when a line loses the race for stock. */
class OutOfStockError extends Error {
  constructor(public productName: string) {
    super(`Out of stock: ${productName}`);
    this.name = 'OutOfStockError';
  }
}

const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Enter a valid email address').max(160),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a reachable phone number')
    .max(24)
    .regex(/^[0-9+()\-\s]+$/, 'Phone number can only contain digits and + ( ) -'),
  address: z.string().trim().min(6, 'Enter your delivery address').max(400),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  zone: z.string().trim().min(2).max(40),
  note: z.string().trim().max(600).optional().nullable(),
  paymentMethod: z.enum(['whatsapp', 'paystack']).default('whatsapp'),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Your bag is empty')
    .max(40),
});

/**
 * POST /api/orders — create an order.
 *
 * Prices, stock and totals are resolved server-side from the catalog; nothing
 * the client sends about money is trusted. Without a database the order is still
 * priced and a WhatsApp link returned, so the shop can trade before Postgres is
 * wired up — it just is not persisted.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Please check the form and try again',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const zone = DELIVERY_ZONES.find((z) => z.id === input.zone);
  if (!zone) {
    return NextResponse.json({ error: 'Choose a delivery area' }, { status: 400 });
  }

  const products = await getProductsBySlugs(input.items.map((i) => i.slug));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const missing = input.items.filter((i) => !bySlug.has(i.slug));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `No longer available: ${missing.map((m) => m.slug).join(', ')}` },
      { status: 409 },
    );
  }

  const outOfStock = input.items.filter((i) => {
    const product = bySlug.get(i.slug)!;
    return product.stock < i.quantity;
  });
  if (outOfStock.length > 0) {
    const names = outOfStock.map((i) => bySlug.get(i.slug)!.name).join(', ');
    return NextResponse.json(
      { error: `Not enough stock for: ${names}. Please reduce the quantity.` },
      { status: 409 },
    );
  }

  const items = input.items.map((i) => {
    const product = bySlug.get(i.slug)!;
    return {
      productId: product.id.startsWith('seed-') ? null : product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity: i.quantity,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = deliveryFeeFor(zone.id, subtotal);
  const total = subtotal + deliveryFee;
  const reference = generateReference();

  const whatsappUrl = buildOrderWhatsAppLink({
    reference,
    customerName: input.customerName,
    phone: input.phone,
    address: input.address,
    city: input.city,
    zoneLabel: zone.label,
    note: input.note,
    items,
    subtotal,
    deliveryFee,
    total,
  });

  // Attach the order to an account when one is signed in. Guests get null and
  // an otherwise identical order — checkout is never gated behind an account.
  const customerId = await getCustomerId().catch(() => null);

  const base = {
    reference,
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: zone.label,
    note: input.note ?? null,
    deliveryFee,
    subtotal,
    total,
    paymentMethod: input.paymentMethod,
  };

  if (!hasDatabase || !prisma) {
    return NextResponse.json(
      {
        order: { ...base, id: reference, status: 'PENDING', items, createdAt: new Date().toISOString() },
        whatsappUrl,
        persisted: false,
      },
      { status: 201 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: { ...base, customerId, items: { create: items } },
        include: { items: true },
      });

      /*
        Reserve stock with a conditional update rather than a plain decrement.

        The availability check above ran before this transaction, so on its own
        it is only advice: two shoppers buying the last item at the same moment
        both read stock as 1, both pass, and both decrement — the counter goes
        negative and the item is sold twice. Verified, not theoretical.

        `updateMany` with `stock: { gte: quantity }` makes the check and the
        decrement one atomic statement. A count of 0 means someone else took the
        last one first, and throwing rolls the whole order back.
      */
      for (const item of items) {
        if (!item.productId) continue;

        const claimed = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (claimed.count === 0) {
          throw new OutOfStockError(item.name);
        }
      }

      return created;
    });

    return NextResponse.json({ order, whatsappUrl, persisted: true }, { status: 201 });
  } catch (error) {
    // Losing a race for the last item is a normal outcome, not a fault: say so
    // plainly instead of pretending the order went through.
    if (error instanceof OutOfStockError) {
      return NextResponse.json(
        {
          error: `Someone just took the last ${error.productName}. Please reduce the quantity or remove it from your bag.`,
        },
        { status: 409 },
      );
    }

    console.error('[orders] failed to persist order', error);
    // The customer should never lose an order to a database hiccup — hand back
    // the WhatsApp link so the sale can still complete manually.
    return NextResponse.json(
      {
        order: { ...base, id: reference, status: 'PENDING', items, createdAt: new Date().toISOString() },
        whatsappUrl,
        persisted: false,
        warning: 'Order could not be saved to the database, but your WhatsApp order is ready.',
      },
      { status: 201 },
    );
  }
}
