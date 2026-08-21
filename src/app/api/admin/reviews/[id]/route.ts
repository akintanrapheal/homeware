import { NextResponse } from 'next/server';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const patchSchema = z.object({
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
  author: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().max(60).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  body: z.string().trim().min(10).max(1200).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid update' },
      { status: 400 },
    );
  }

  const data = { ...parsed.data };

  // Featuring something unapproved would put it on the home page while the
  // reviews screen still lists it as waiting — approve it in the same breath.
  if (data.featured === true) data.approved = true;

  try {
    const review = await prisma.review.update({ where: { id }, data });
    await audit('review.update', `${review.author}: ${Object.keys(parsed.data).join(', ')} changed`, {
      target: review.id,
    });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  try {
    const review = await prisma.review.delete({ where: { id } });
    await audit('review.delete', `Deleted review by ${review.author}`, { target: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }
}
