import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { getCustomerId } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SAFE_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  zone: true,
} as const;

/**
 * GET /api/account/me — the signed-in customer, or `{ customer: null }`.
 *
 * Returns 200 with a null customer rather than 401: "signed out" is a normal
 * state for a storefront, not an error, and the header calls this on every page.
 */
export async function GET() {
  if (!hasDatabase || !prisma) return NextResponse.json({ customer: null });

  const id = await getCustomerId();
  if (!id) return NextResponse.json({ customer: null });

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: SAFE_FIELDS,
  });
  return NextResponse.json({ customer: customer ?? null });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(24).nullable().optional(),
  address: z.string().trim().max(400).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  zone: z.string().trim().max(40).nullable().optional(),
});

/** PATCH /api/account/me — update the saved delivery details. */
export async function PATCH(request: Request) {
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'Accounts require a database' }, { status: 503 });
  }

  const id = await getCustomerId();
  if (!id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid update' },
      { status: 400 },
    );
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: parsed.data,
      select: SAFE_FIELDS,
    });
    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: 'Could not save your details' }, { status: 404 });
  }
}
