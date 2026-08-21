'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, ShieldIcon, SpinnerIcon, TrashIcon } from '@/components/icons';
import { formatDate } from '@/lib/format';
import { ROLES, type Role } from '@/lib/roles';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  suspended: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const BLANK = { name: '', email: '', password: '', role: 'STAFF' as Role };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [me, setMe] = useState<{ id: string; role: Role } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(BLANK);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not load staff');
      setUsers(d.users);
      setMe(d.me);
      setNotice('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Partial<StaffUser> & { password?: string }) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      // The server owns these rules; surfacing its exact refusal explains why.
      setNotice(d?.error ?? 'Could not save that change.');
      return;
    }
    setNotice('');
    load();
  }

  async function remove(u: StaffUser) {
    if (!window.confirm(`Remove ${u.name}? They lose access immediately.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => null);
    if (!res.ok) setNotice(d?.error ?? 'Could not remove that account.');
    else load();
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not add that person');
      setDraft(BLANK);
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not add that person');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Staff</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Everyone signs in with their own email and password. Restricting someone takes effect on
          their next click, not when their session expires.
        </p>
      </header>

      {notice && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)',
            color: 'var(--admin-bad)',
          }}
        >
          {notice}
        </p>
      )}

      <div className="admin-panel mb-5 p-5">
        <h2 className="mb-3 text-sm font-semibold">What each role can do</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((r) => (
            <li key={r.id} className="rounded-lg p-3" style={{ background: 'var(--admin-panel-2)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{r.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--admin-muted)' }}>
                {r.blurb}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={create} className="admin-panel mb-5 p-5">
        <h2 className="mb-4 text-sm font-semibold">Add someone</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="admin-label">Name</label>
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Email</label>
            <input
              required
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Temporary password</label>
            <input
              required
              minLength={8}
              value={draft.password}
              onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Role</label>
            <select
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as Role }))}
              className="admin-input mt-1.5"
            >
              {ROLES.filter((r) => r.id !== 'OWNER' || me?.role === 'OWNER').map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={creating} className="admin-btn admin-btn-primary w-full disabled:opacity-60">
              {creating ? <SpinnerIcon width={14} height={14} /> : 'Add'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--admin-muted)' }}>
          Give them the temporary password directly; they can change it under Your profile.
        </p>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <SpinnerIcon width={24} height={24} style={{ color: 'var(--admin-accent)' }} />
        </div>
      ) : (
        <div className="admin-panel overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--admin-line)', color: 'var(--admin-muted)' }}>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">Person</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Role</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Last signed in</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Access</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isOwner = u.role === 'OWNER';
                const isSelf = me?.id === u.id;
                const locked = isOwner || isSelf;

                return (
                  <tr key={u.id} className="border-b" style={{ borderColor: 'var(--admin-line)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p style={{ color: 'var(--admin-text)' }}>{u.name}</p>
                        {isOwner && (
                          <span
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem]"
                            style={{
                              color: 'var(--admin-accent)',
                              background: 'color-mix(in oklab, var(--admin-accent) 15%, transparent)',
                            }}
                          >
                            <ShieldIcon width={10} height={10} />
                            owner
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-[0.6rem]" style={{ color: 'var(--admin-muted)' }}>you</span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>{u.email}</p>
                    </td>

                    <td className="px-3 py-3">
                      <select
                        value={u.role}
                        disabled={isOwner}
                        onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                        className="admin-input w-32 disabled:opacity-50"
                      >
                        {ROLES.filter((r) => r.id !== 'OWNER' || me?.role === 'OWNER' || isOwner).map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'never'}
                    </td>

                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => patch(u.id, { suspended: !u.suspended })}
                        className="rounded-md px-2.5 py-1.5 text-[0.65rem] font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                        style={
                          u.suspended
                            ? { background: 'color-mix(in oklab, var(--admin-bad) 15%, transparent)', color: 'var(--admin-bad)' }
                            : { background: 'color-mix(in oklab, var(--admin-good) 15%, transparent)', color: 'var(--admin-good)' }
                        }
                        title={isOwner ? 'The owner cannot be restricted' : isSelf ? 'You cannot restrict yourself' : undefined}
                      >
                        {u.suspended ? 'Restricted' : (
                          <span className="inline-flex items-center gap-1">
                            <CheckIcon width={11} height={11} />
                            Active
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => remove(u)}
                        aria-label={`Remove ${u.name}`}
                        className="transition disabled:cursor-not-allowed disabled:opacity-30 hover:opacity-70"
                        style={{ color: 'var(--admin-muted)' }}
                        title={isOwner ? 'The owner cannot be deleted' : isSelf ? 'You cannot delete yourself' : undefined}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: 'var(--admin-muted)' }}>
        The owner account is deliberately protected: it cannot be restricted, demoted or deleted, so
        the shop can never lock itself out of its own admin.
      </p>
    </>
  );
}
