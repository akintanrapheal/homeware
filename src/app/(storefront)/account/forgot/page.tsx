'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRightIcon, CheckIcon, SpinnerIcon } from '@/components/icons';

export default function ForgotPasswordPage() {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'loading') return;
    setState('loading');

    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/account/password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(form.get('email') ?? '') }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message ?? data.error ?? 'Please try again.');
    setState('done');
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Account</p>
          <h1 className="font-display text-4xl text-ink-900">Forgot password</h1>
          <p className="mt-3 text-sm text-ink-600">
            We will email you a link to choose a new one.
          </p>
        </div>

        {state === 'done' ? (
          <div className="card flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-100">
              <CheckIcon width={22} height={22} className="text-clay-600" />
            </div>
            <p className="text-sm text-ink-600">{message}</p>
            <Link href="/account/login" className="btn btn-outline mt-1">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" required className="field" autoComplete="email" />
            </div>
            <button type="submit" disabled={state === 'loading'} className="btn btn-clay w-full disabled:opacity-60">
              {state === 'loading' ? <SpinnerIcon width={16} height={16} /> : <>Send reset link <ArrowRightIcon width={16} height={16} /></>}
            </button>
            <p className="text-center text-xs text-ink-500">
              Remembered it? <Link href="/account/login" className="text-clay-600">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
