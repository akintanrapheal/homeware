'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldIcon, SpinnerIcon } from '@/components/icons';

/**
 * Staff sign-in. Intentionally nothing like the customer login: no serif, no
 * champagne, no shopfront chrome — so it is never ambiguous which door you are
 * standing at, and a customer who lands here knows immediately it is not for
 * them.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not sign in');

      setPassword('');
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setLoading(false);
    }
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
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Minah & Co
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              Store administration
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-panel p-6">
          <h1 className="text-lg" style={{ color: 'var(--admin-text)' }}>
            Staff sign in
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--admin-muted)' }}>
            This area manages orders, stock and pricing. Customer accounts sign in on the
            storefront.
          </p>

          <label htmlFor="password" className="admin-label mt-6 block">
            Store password
          </label>
          <input
            id="password"
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input mt-2"
            autoComplete="current-password"
          />

          {error && (
            <p
              className="mt-3 rounded-lg px-3 py-2 text-xs"
              style={{
                background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)',
                color: 'var(--admin-bad)',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="admin-btn admin-btn-primary mt-5 w-full disabled:opacity-60"
          >
            {loading ? <SpinnerIcon width={15} height={15} /> : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: 'var(--admin-muted)' }}>
          <a href="/" className="underline underline-offset-4 hover:opacity-80">
            Return to the storefront
          </a>
        </p>
      </div>
    </div>
  );
}
