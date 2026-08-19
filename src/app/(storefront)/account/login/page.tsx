'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAccount } from '@/components/account-provider';
import { ArrowRightIcon, SpinnerIcon } from '@/components/icons';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { setCustomer } = useAccount();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Set when checkout sends a shopper here, so we return them to their bag.
  const next = search.get('next') || '/account';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not sign in');

      setCustomer(data.customer);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Welcome back</p>
          <h1 className="font-display text-4xl font-light text-ink-900">Sign in</h1>
          <p className="mt-3 text-sm text-ink-600">
            Track your orders and check out faster next time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" required className="field" autoComplete="email" />
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
              className="field"
              autoComplete="current-password"
            />
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
                Sign in
                <ArrowRightIcon width={16} height={16} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-ink-500">
            New here?{' '}
            <Link
              href={`/account/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="text-clay-600 hover:text-clay-700"
            >
              Create an account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <SpinnerIcon width={26} height={26} className="text-clay-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
