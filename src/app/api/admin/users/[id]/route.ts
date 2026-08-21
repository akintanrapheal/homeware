import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { can, getAdminSession, hashPassword } from '@/lib/admin-auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SAFE = {
  id: true,
  name: true,
  email: true,
  role: true,
  suspended: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(160).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']).optional(),
  suspended: z.boolean().optional(),
  password: z.string().min(8, 'Use at least 8 characters').max(200).optional(),
});

/**
 * Guards that apply to every write, in one place.
 *
 * The rules exist to stop the shop locking itself out or quietly losing its
 * owner, which is a worse outcome than any they prevent.
 */
async function guard(
  targetId: string,
  change: { role?: string; suspended?: boolean; deleting?: boolean },
): Promise<string | null> {
  const session = await getAdminSession();
  if (!can(session?.role, 'users.manage')) return 'You do not have access to staff accounts';
  if (!prisma) return 'No database connected';

  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target) return 'That account no longer exists';

  const isSelf = session?.id === targetId;

  // The owner is untouchable by anyone else, and cannot demote, suspend or
  // delete themselves either — someone must always be able to get in.
  if (target.role === 'OWNER') {
    if (session?.role !== 'OWNER') return 'Only an owner can change an owner account';
    if (change.deleting) return 'The owner account cannot be deleted';
    if (change.suspended === true) return 'The owner account cannot be restricted';
    if (change.role && change.role !== 'OWNER') {
      const owners = await prisma.adminUser.count({ where: { role: 'OWNER' } });
      if (owners <= 1) return 'This is the only owner — promote someone else first';
    }
  }

  if (change.role === 'OWNER' && session?.role !== 'OWNER') {
    return 'Only an owner can promote someone to owner';
  }

  // Locking yourself out mid-session is a mistake, not an intention.
  if (isSelf && change.suspended === true) return 'You cannot restrict your own account';
  if (isSelf && change.deleting) return 'You cannot delete your own account';

  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const refusal = await guard(id, parsed.data);
  if (refusal) return NextResponse.json({ error: refusal }, { status: 403 });

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await hashPassword(password);

  try {
    const user = await prisma.adminUser.update({ where: { id }, data, select: SAFE });
    await audit(
      'user.update',
      `${user.email}: ${Object.keys(parsed.data).filter((k) => k !== 'password').join(', ') || 'password'} changed`,
      { target: user.id },
    );
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const { id } = await params;
  const refusal = await guard(id, { deleting: true });
  if (refusal) return NextResponse.json({ error: refusal }, { status: 403 });

  const user = await prisma.adminUser.delete({ where: { id }, select: SAFE });
  await audit('user.delete', `Removed ${user.email}`, { target: id });
  return NextResponse.json({ ok: true });
}
