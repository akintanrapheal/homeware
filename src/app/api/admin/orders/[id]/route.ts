import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  /** Set when the operator has confirmed an unusual move. */
  force: z.boolean().optional(),
});

type Status = 'PENDING' | 'PAID' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/**
 * Fulfilment normally runs forwards. Going backwards is not forbidden — a
 * mis-click has to be undoable — but it is not offered silently either, so a
 * DELIVERED order does not quietly become PENDING and lose its place.
 */
const FORWARD: Record<Status, Status[]> = {
  PENDING: ['PAID', 'PACKED', 'CANCELLED'],
  PAID: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: ['PENDING', 'PAID'],
};

/** PATCH /api/admin/orders/:id — advance an order through fulfilment. */
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
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const nextStatus = parsed.data.status;
  const current = existing.status as Status;

  if (nextStatus === current) {
    return NextResponse.json({ order: existing });
  }

  if (!parsed.data.force && !FORWARD[current].includes(nextStatus)) {
    return NextResponse.json(
      {
        error: `Moving an order from ${current} to ${nextStatus} is going backwards. Confirm to do it anyway.`,
        needsConfirmation: true,
        from: current,
        to: nextStatus,
      },
      { status: 409 },
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    // Cancelling returns the reserved stock; un-cancelling takes it back out.
    if (nextStatus === 'CANCELLED' && existing.status !== 'CANCELLED') {
      for (const item of existing.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    } else if (existing.status === 'CANCELLED' && nextStatus !== 'CANCELLED') {
      for (const item of existing.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'PAID' && !existing.paidAt ? { paidAt: new Date() } : {}),
      },
      include: { items: true },
    });
  });

  await audit('order.status', `${existing.reference}: ${current} → ${nextStatus}`, {
    target: existing.reference,
    meta: { from: current, to: nextStatus, forced: Boolean(parsed.data.force) },
  });

  return NextResponse.json({ order });
}
