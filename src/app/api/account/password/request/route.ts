import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabase, prisma } from '@/lib/prisma';
import { identify, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { sendPasswordReset } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { STORE } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
});

/**
 * POST /api/account/password/request
 *
 * Always answers the same way whether or not the address has an account. A
 * different response would turn this into a way to discover which of your
 * customers are registered.
 */
export async function POST(request: Request) {
  const limit = await rateLimit('password-request', identify(request), 5, 900);
  if (!limit.ok) return tooManyRequests(limit);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const acknowledgement = NextResponse.json({
    message: 'If that address has an account, a reset link is on its way.',
  });

  if (!hasDatabase || !prisma) return acknowledgement;

  const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
  if (!customer) return acknowledgement;

  // The raw token goes in the email; only its hash is stored, so a leaked
  // database still cannot be used to take over an account.
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  try {
    await prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const settings = await getSettings();
    const base = process.env.NEXT_PUBLIC_SITE_URL || STORE.url;
    await sendPasswordReset(
      customer.email,
      customer.name,
      `${base}/account/reset?token=${encodeURIComponent(token)}`,
    );
    void settings;
  } catch (error) {
    console.error('[password-reset] could not issue token', error);
  }

  return acknowledgement;
}
