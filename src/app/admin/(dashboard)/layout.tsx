import { redirect } from 'next/navigation';
import { getAdminSession, permissionsFor } from '@/lib/admin-auth';
import { AdminNav } from '@/components/admin-nav';

export const dynamic = 'force-dynamic';

/**
 * Auth guard for everything under /admin except the login page.
 *
 * Checked on the server, so an unauthenticated request never receives the
 * dashboard markup at all — as opposed to shipping it and hiding it in the
 * browser.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <div className="lg:flex">
      <AdminNav session={session} permissions={permissionsFor(session.role)} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
