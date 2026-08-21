import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { ZONES_TAG } from '@/lib/settings';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { DELIVERY_ZONES } from '@/lib/config';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const zoneSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  label: z.string().trim().min(2).max(80),
  fee: z.number().int().min(0).max(10_000_000),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await getAdminSession();
  if (!can(session?.role, 'settings.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const zones = await prisma.deliveryZoneRow.findMany({
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });

  // Offer the compiled defaults for one-click import rather than making the
  // operator retype eight zones to start using this screen.
  return NextResponse.json({
    zones,
    defaults: zones.length === 0 ? DELIVERY_ZONES : [],
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'settings.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);

  if (body?.importDefaults === true) {
    const db = prisma;
    await db.$transaction(
      DELIVERY_ZONES.map((z, i) =>
        db.deliveryZoneRow.upsert({
          where: { slug: z.id },
          update: {},
          create: { slug: z.id, label: z.label, fee: z.fee, sortOrder: i },
        }),
      ),
    );
    await audit('zones.import', `Imported ${DELIVERY_ZONES.length} default delivery zones`);
    revalidateTag(ZONES_TAG);
  return NextResponse.json({ imported: DELIVERY_ZONES.length }, { status: 201 });
  }

  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the zone fields' },
      { status: 400 },
    );
  }

  try {
    const zone = await prisma.deliveryZoneRow.create({ data: parsed.data });
    await audit('zones.create', `Added zone ${zone.label} at ${zone.fee}`, { target: zone.slug });
    revalidateTag(ZONES_TAG);
    return NextResponse.json({ zone }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A zone with that slug already exists' }, { status: 409 });
  }
}
