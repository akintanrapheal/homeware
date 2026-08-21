'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ShieldIcon, SpinnerIcon } from '@/components/icons';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirm') ?? '')) {
      setError('Those two passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not reset your password');
      router.replace('/admin/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset your password');
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="admin-panel p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
          That link is missing its code. Please request a new one.
        </p>
        <Link href="/admin/forgot" className="admin-btn admin-btn-ghost mt-4 inline-flex">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="admin-panel p-6">
      <h1 className="text-lg" style={{ color: 'var(--admin-text)' }}>Choose a new password</h1>

      <label htmlFor="password" className="admin-label mt-5 block">New password</label>
      <input id="password" name="password" type="password" required minLength={8} autoFocus className="admin-input mt-1.5" />

      <label htmlFor="confirm" className="admin-label mt-4 block">Confirm password</label>
      <input id="confirm" name="confirm" type="password" required minLength={8} className="admin-input mt-1.5" />

      {error && (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)', color: 'var(--admin-bad)' }}
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="admin-btn admin-btn-primary mt-5 w-full disabled:opacity-60">
        {loading ? <SpinnerIcon width={15} height={15} /> : 'Change password'}
      </button>
    </form>
  );
}

export default function AdminResetPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: 'var(--admin-panel-2)', color: 'var(--admin-accent)' }}
          >
            <ShieldIcon width={21} height={21} />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Store administration</p>
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Reset your password</p>
          </div>
        </div>
        <Suspense fallback={<div className="admin-panel h-56 animate-pulse" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
