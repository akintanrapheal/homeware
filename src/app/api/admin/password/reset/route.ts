import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/admin-auth';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().trim().min(10).max(200),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

export async function POST(request: Request) {
  const limit = await rateLimit('admin-password-reset', identify(request), 10, 900);
  if (!limit.ok) return tooManyRequests(limit);

  if (!hasDatabase || !prisma) {
    return NextResponse.json({ error: 'No database connected' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const record = await prisma.adminResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.json(
      { error: 'That reset link has expired or already been used. Please request a new one.' },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: record.adminUserId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.adminResetToken.updateMany({
      where: { adminUserId: record.adminUserId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await audit('password.reset', 'Staff password reset via emailed link', { target: record.adminUserId });
  return NextResponse.json({ message: 'Your password has been changed. You can sign in now.' });
}
