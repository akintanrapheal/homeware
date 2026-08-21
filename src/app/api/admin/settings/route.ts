import { NextResponse } from 'next/server';
import { z } from 'zod';
import { can, getAdminSession } from '@/lib/admin-auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { sendTestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SINGLETON = 'singleton';

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(400).optional(),
  announcement: z.string().trim().max(160).optional(),

  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(200).optional(),
  tiktok: z.string().trim().max(200).optional(),
  address: z.string().trim().max(200).optional(),
  hours: z.string().trim().max(120).optional(),

  freeDeliveryThreshold: z.number().int().min(0).max(100_000_000).optional(),

  paystackPublicKey: z.string().trim().max(200).optional(),
  paystackSecretKey: z.string().trim().max(200).optional(),
  paystackEnabled: z.boolean().optional(),

  emailApiKey: z.string().trim().max(200).optional(),
  emailFrom: z.string().trim().max(200).optional(),
  emailReplyTo: z.string().trim().max(200).optional(),
  emailOnOrder: z.boolean().optional(),
  notifyStore: z.boolean().optional(),
});

/** Secrets are reported as set-or-not, never echoed back. */
function present(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

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

  const row =
    (await prisma.storeSettings.findUnique({ where: { id: SINGLETON } })) ??
    (await prisma.storeSettings.create({ data: { id: SINGLETON } }));

  const { paystackSecretKey, emailApiKey, ...safe } = row;

  return NextResponse.json({
    settings: {
      ...safe,
      // Booleans, not values: the browser never needs the key itself.
      hasPaystackSecret: present(paystackSecretKey),
      hasEmailApiKey: present(emailApiKey),
      paystackSecretFromEnv: !present(paystackSecretKey) && present(process.env.PAYSTACK_SECRET_KEY),
      emailKeyFromEnv: !present(emailApiKey) && present(process.env.RESEND_API_KEY),
    },
  });
}

export async function PATCH(request: Request) {
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

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the settings' },
      { status: 400 },
    );
  }

  const data = { ...parsed.data };

  /*
    An empty string on a secret means "leave it alone", not "clear it". The form
    cannot show the current value, so it submits blank — treating that as a
    deletion would wipe the key every time anything else on the page was saved.
    Clearing is done explicitly, by sending the literal "-".
  */
  for (const key of ['paystackSecretKey', 'emailApiKey'] as const) {
    const value = data[key];
    if (value === undefined || value === '') delete data[key];
    else if (value === '-') data[key] = '';
  }

  const settings = await prisma.storeSettings.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...data },
    update: data,
  });

  await audit('settings.update', `Updated: ${Object.keys(parsed.data).join(', ')}`, {
    target: 'store-settings',
  });

  const { paystackSecretKey, emailApiKey, ...safe } = settings;
  return NextResponse.json({
    settings: {
      ...safe,
      hasPaystackSecret: present(paystackSecretKey),
      hasEmailApiKey: present(emailApiKey),
    },
  });
}

/** POST — send a test email, so the configuration can be proved before launch. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!can(session?.role, 'settings.manage')) {
    return NextResponse.json(
      { error: session ? 'Your role does not allow that' : 'Unauthorised' },
      { status: session ? 403 : 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const to = typeof body?.testEmail === 'string' ? body.testEmail.trim() : '';
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'Enter an address to send the test to' }, { status: 400 });
  }

  const result = await sendTestEmail(to);
  if (!result.sent) {
    return NextResponse.json(
      { error: result.skipped ?? `Could not send (${result.error ?? 'unknown'})` },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: `Test email sent to ${to}.` });
}
