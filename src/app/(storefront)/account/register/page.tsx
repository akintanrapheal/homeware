'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAccount } from '@/components/account-provider';
import { safeRedirect } from '@/lib/safe-redirect';
import { ArrowRightIcon, SpinnerIcon } from '@/components/icons';

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { setCustomer } = useAccount();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const next = safeRedirect(search.get('next'), '/account');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
          phone: String(form.get('phone') ?? '') || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not create your account');

      setCustomer(data.customer);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Join the house</p>
          <h1 className="font-display text-4xl font-light text-ink-900">Create account</h1>
          <p className="mt-3 text-sm text-ink-600">
            Save your details, track every order, reorder in two taps.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
          <div>
            <label htmlFor="name" className="label">
              Full name
            </label>
            <input id="name" name="name" required className="field" autoComplete="name" />
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" required className="field" autoComplete="email" />
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Phone (optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="0801 234 5678"
              className="field"
              autoComplete="tel"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="field"
              autoComplete="new-password"
            />
            <p className="mt-2 text-[0.7rem] text-ink-500">At least 8 characters.</p>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-accent/40 bg-rose-accent/8 px-4 py-3 text-xs text-rose-accent">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-clay w-full disabled:opacity-60">
            {loading ? (
              <SpinnerIcon width={16} height={16} />
            ) : (
              <>
                Create account
                <ArrowRightIcon width={16} height={16} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-ink-500">
            Already have one?{' '}
            <Link
              href={`/account/login${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="text-clay-600 hover:text-clay-700"
            >
              Sign in
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-ink-500">
          You never need an account to order — <Link href="/checkout" className="text-clay-600/80 hover:text-clay-700">checkout as a guest</Link> any time.
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <SpinnerIcon width={26} height={26} className="text-clay-500" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
