'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckIcon, ShieldIcon, SpinnerIcon } from '@/components/icons';

export default function AdminForgotPage() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = new FormData(event.currentTarget);
    setState('sending');

    const res = await fetch('/api/admin/password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(form.get('email') ?? '') }),
    });
    const d = await res.json().catch(() => ({}));
    setMessage(d.message ?? d.error ?? 'Please try again.');
    setState('done');
  }

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

        {state === 'done' ? (
          <div className="admin-panel p-6 text-center">
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'color-mix(in oklab, var(--admin-good) 15%, transparent)', color: 'var(--admin-good)' }}
            >
              <CheckIcon width={20} height={20} />
            </div>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>{message}</p>
            <Link href="/admin/login" className="admin-btn admin-btn-ghost mt-4 inline-flex">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="admin-panel p-6">
            <h1 className="text-lg" style={{ color: 'var(--admin-text)' }}>Forgot your password</h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--admin-muted)' }}>
              We will email you a link to choose a new one. It works once and expires in an hour.
            </p>

            <label htmlFor="email" className="admin-label mt-5 block">Email</label>
            <input id="email" name="email" type="email" required autoFocus className="admin-input mt-1.5" />

            <button type="submit" disabled={state === 'sending'} className="admin-btn admin-btn-primary mt-5 w-full disabled:opacity-60">
              {state === 'sending' ? <SpinnerIcon width={15} height={15} /> : 'Send reset link'}
            </button>

            <p className="mt-4 text-center text-xs">
              <Link href="/admin/login" style={{ color: 'var(--admin-accent)' }}>Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
