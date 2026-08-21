import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { getAdminSession, hashPassword, can } from '@/lib/admin-auth';
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

const createSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']).default('STAFF'),
});

export async function GET() {
  const session = await getAdminSession();
  if (!can(session?.role, 'users.manage')) {
    return NextResponse.json({ error: 'You do not have access to staff accounts' }, { status: 403 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const users = await prisma.adminUser.findMany({
    select: SAFE,
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ users, me: session });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'users.manage')) {
    return NextResponse.json({ error: 'You do not have access to staff accounts' }, { status: 403 });
  }
  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the details' },
      { status: 400 },
    );
  }

  // Only an owner may mint another owner. Otherwise an admin could promote
  // themselves sideways into the one role that cannot be removed.
  if (parsed.data.role === 'OWNER' && session?.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only an owner can create another owner' }, { status: 403 });
  }

  try {
    const { password, ...rest } = parsed.data;
    const user = await prisma.adminUser.create({
      data: { ...rest, passwordHash: await hashPassword(password) },
      select: SAFE,
    });
    await audit('user.create', `Added ${user.email} as ${user.role}`, { target: user.id });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }
}
