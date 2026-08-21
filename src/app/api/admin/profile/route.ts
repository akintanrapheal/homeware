import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { getAdminSession, hashPassword, verifyPassword } from '@/lib/admin-auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(200).optional(),
});

/**
 * PATCH /api/admin/profile — a staff member editing their own account.
 *
 * Separate from the staff-management endpoint on purpose: everyone may edit
 * themselves, nobody may change their own role here, and changing a password
 * requires the current one even though the session already proves identity —
 * an unattended screen should not be enough to lock the real owner out.
 */
export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the form' },
      { status: 400 },
    );
  }

  const { name, email, currentPassword, newPassword } = parsed.data;
  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email) data.email = email;

  if (newPassword) {
    const me = await prisma.adminUser.findUnique({ where: { id: session.id } });
    if (!me) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    if (!currentPassword || !(await verifyPassword(currentPassword, me.passwordHash))) {
      return NextResponse.json({ error: 'Your current password is not correct' }, { status: 401 });
    }
    data.passwordHash = await hashPassword(newPassword);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
  }

  try {
    const user = await prisma.adminUser.update({
      where: { id: session.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    await audit('profile.update', `${user.email} updated their own profile`, { target: user.id });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
  }
}
