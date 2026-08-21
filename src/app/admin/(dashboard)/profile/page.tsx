'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, ShieldIcon, SpinnerIcon } from '@/components/icons';

interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user);
        setPermissions(d.permissions ?? []);
      })
      .catch(() => setError('Could not load your profile'));
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>, body: Record<string, unknown>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not save');
      if (d.user) setMe(d.user);
      setSaved('Saved.');
      router.refresh();
      window.setTimeout(() => setSaved(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon width={26} height={26} style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Your profile</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Signed in as {me.email}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem]"
            style={{
              color: 'var(--admin-accent)',
              background: 'color-mix(in oklab, var(--admin-accent) 15%, transparent)',
            }}
          >
            <ShieldIcon width={11} height={11} />
            {me.role.toLowerCase()}
          </span>
        </p>
      </header>

      {(error || saved) && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={
            error
              ? { background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)', color: 'var(--admin-bad)' }
              : { background: 'color-mix(in oklab, var(--admin-good) 14%, transparent)', color: 'var(--admin-good)' }
          }
        >
          {error || saved}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            const f = new FormData(e.currentTarget);
            save(e, { name: String(f.get('name') ?? ''), email: String(f.get('email') ?? '') });
          }}
          className="admin-panel space-y-4 p-5"
        >
          <h2 className="text-sm font-semibold">Details</h2>
          <div>
            <label htmlFor="name" className="admin-label">Name</label>
            <input id="name" name="name" required defaultValue={me.name} className="admin-input mt-1.5" />
          </div>
          <div>
            <label htmlFor="email" className="admin-label">Email</label>
            <input id="email" name="email" type="email" required defaultValue={me.email} className="admin-input mt-1.5" />
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              This is what you sign in with.
            </p>
          </div>
          <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
            {saving ? <SpinnerIcon width={14} height={14} /> : 'Save details'}
          </button>
        </form>

        <form
          onSubmit={(e) => {
            const f = new FormData(e.currentTarget);
            const next = String(f.get('newPassword') ?? '');
            if (next !== String(f.get('confirm') ?? '')) {
              e.preventDefault();
              setError('Those two passwords do not match.');
              return;
            }
            save(e, {
              currentPassword: String(f.get('currentPassword') ?? ''),
              newPassword: next,
            });
            (e.target as HTMLFormElement).reset();
          }}
          className="admin-panel space-y-4 p-5"
        >
          <h2 className="text-sm font-semibold">Change password</h2>
          <div>
            <label htmlFor="currentPassword" className="admin-label">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" required className="admin-input mt-1.5" />
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              Required even though you are signed in — an unattended screen should not be enough to
              lock you out of your own account.
            </p>
          </div>
          <div>
            <label htmlFor="newPassword" className="admin-label">New password</label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} className="admin-input mt-1.5" />
          </div>
          <div>
            <label htmlFor="confirm" className="admin-label">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} className="admin-input mt-1.5" />
          </div>
          <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
            {saving ? <SpinnerIcon width={14} height={14} /> : 'Change password'}
          </button>
        </form>
      </div>

      <div className="admin-panel mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">What your role allows</h2>
        <ul className="flex flex-wrap gap-2">
          {permissions.map((p) => (
            <li
              key={p}
              className="rounded-md px-2.5 py-1 text-xs"
              style={{ background: 'var(--admin-panel-2)', color: 'var(--admin-muted)' }}
            >
              <CheckIcon width={11} height={11} className="mr-1 inline" />
              {p.replace('.', ' · ')}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
