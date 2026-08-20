'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowRightIcon, SpinnerIcon } from '@/components/icons';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      const res = await fetch('/api/account/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not reset your password');
      router.push('/account/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset your password');
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-600">
          That link is missing its code. Please request a new one.
        </p>
        <Link href="/account/forgot" className="btn btn-outline mt-4">Request a new link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input id="password" name="password" type="password" required minLength={8} className="field" autoComplete="new-password" />
        <p className="mt-2 text-[0.7rem] text-ink-500">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} className="field" autoComplete="new-password" />
      </div>

      {error && (
        <p className="rounded-xl border border-rose-accent/40 bg-clay-100 px-4 py-3 text-xs text-rose-accent">{error}</p>
      )}

      <button type="submit" disabled={loading} className="btn btn-clay w-full disabled:opacity-60">
        {loading ? <SpinnerIcon width={16} height={16} /> : <>Change password <ArrowRightIcon width={16} height={16} /></>}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Account</p>
          <h1 className="font-display text-4xl text-ink-900">Choose a new password</h1>
        </div>
        <Suspense fallback={<div className="card h-64 animate-pulse" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
