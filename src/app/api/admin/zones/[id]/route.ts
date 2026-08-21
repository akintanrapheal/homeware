import { NextResponse } from 'next/server';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const patchSchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  fee: z.number().int().min(0).max(10_000_000).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!can(session?.role, 'settings.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) return NextResponse.json({ error: 'No database connected' }, { status: 503 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid update' }, { status: 400 });
  }

  try {
    const zone = await prisma.deliveryZoneRow.update({ where: { id }, data: parsed.data });
    await audit('zones.update', `${zone.label}: ${Object.keys(parsed.data).join(', ')} changed`, {
      target: zone.slug,
    });
    return NextResponse.json({ zone });
  } catch {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }
}

/**
 * Deleting a zone does not affect past orders — they store the zone's label as
 * text, so an old order still shows where it went.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!can(session?.role, 'settings.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) return NextResponse.json({ error: 'No database connected' }, { status: 503 });

  const { id } = await params;
  try {
    const zone = await prisma.deliveryZoneRow.delete({ where: { id } });
    await audit('zones.delete', `Removed zone ${zone.label}`, { target: zone.slug });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }
}
