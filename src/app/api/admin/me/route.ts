import { NextResponse } from 'next/server';
import { getAdminSession, permissionsFor } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/me — who is signed in and what they may do.
 *
 * Returns 200 with a null user when signed out: the admin shell calls this on
 * every page, and "signed out" is a state rather than an error.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ user: null, permissions: [] });

  return NextResponse.json({
    user: session,
    permissions: permissionsFor(session.role),
  });
}
