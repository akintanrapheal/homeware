import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/upload — product photography.
 *
 * Uploads go to Vercel Blob. There are two ways a connected store authenticates
 * and both must be accepted:
 *
 *   - OIDC, the current default: BLOB_STORE_ID plus a short-lived token the
 *     platform rotates for you. No long-lived secret is stored anywhere.
 *   - BLOB_READ_WRITE_TOKEN, a long-lived key, added only if you tick the
 *     optional box when connecting — and needed for anything running off-platform.
 *
 * Insisting on the second refused perfectly good OIDC connections, so the guard
 * now only checks that a store is attached at all and lets the SDK decide. If
 * neither is present the endpoint says so plainly: pasting an image URL still
 * works everywhere in the admin, so an unconfigured store is inconvenienced,
 * not blocked.
 *
 * Body is multipart/form-data with a single `file` field.
 */

const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps a serverless request body at ~4.5MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const blobConfigured = Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL_OIDC_TOKEN,
  );

  if (!blobConfigured) {
    return NextResponse.json(
      {
        error:
          'Image uploads are not set up yet. In Vercel: Storage → Create → Blob, connect it to this project, then redeploy. You can paste an image URL in the meantime.',
      },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get('file');
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: 'Could not read the upload' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No file was attached' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Use a JPEG, PNG, WebP, AVIF or GIF image' },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Keep it under 4MB.` },
      { status: 413 },
    );
  }

  try {
    // addRandomSuffix keeps two photos named "IMG_1234.jpg" from overwriting
    // one another, which is otherwise very easy to do from a phone.
    const blob = await put(`products/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url, size: file.size, type: file.type }, { status: 201 });
  } catch (error) {
    console.error('[upload] failed', error);

    /*
      Surface what actually went wrong rather than a generic failure. An
      authentication problem here means the store is attached but the
      credentials are not usable — which needs a different fix from a network
      blip, and "Upload failed, please try again" would send someone retrying
      forever.
    */
    const detail = error instanceof Error ? error.message : '';
    const isAuth = /token|unauthor|forbidden|credential|access/i.test(detail);

    return NextResponse.json(
      {
        error: isAuth
          ? 'Vercel Blob rejected the credentials. Open the Blob store in Vercel, check this project is on its Projects tab, then redeploy so the new variables reach the running build.'
          : 'Upload failed. Please try again.',
        detail: detail.slice(0, 200) || undefined,
      },
      { status: 502 },
    );
  }
}
