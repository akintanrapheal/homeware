import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { sendPasswordReset } from '@/lib/email';
import { STORE } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
});

/**
 * POST /api/admin/password/request — a staff member who has forgotten theirs.
 *
 * Answers the same either way, so this cannot be used to discover which
 * addresses have staff access — which would be a useful list to an attacker.
 */
export async function POST(request: Request) {
  const limit = await rateLimit('admin-password-request', identify(request), 5, 900);
  if (!limit.ok) return tooManyRequests(limit);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const acknowledgement = NextResponse.json({
    message: 'If that address has staff access, a reset link is on its way.',
  });

  if (!hasDatabase || !prisma) return acknowledgement;

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  // A suspended account should not be able to let itself back in.
  if (!user || user.suspended) return acknowledgement;

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  try {
    await prisma.adminResetToken.create({
      data: { adminUserId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL || STORE.url;
    await sendPasswordReset(user.email, user.name, `${base}/admin/reset?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('[admin-reset] could not issue token', error);
  }

  return acknowledgement;
}
