'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldIcon, SpinnerIcon } from '@/components/icons';

/**
 * Staff sign-in. Nothing like the customer login: no serif, no shopfront
 * chrome, so it is never ambiguous which door you are at.
 *
 * On a shop with no staff accounts yet this becomes a one-time setup form
 * instead. Creating the first owner needs ADMIN_PASSWORD as proof of
 * authority — otherwise a fresh deployment would have a login form and no
 * possible way through it.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'checking' | 'login' | 'bootstrap'>('checking');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/login')
      .then((r) => r.json())
      .then((d) => setMode(d.needsBootstrap ? 'bootstrap' : 'login'))
      .catch(() => setMode('login'));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');

    const body =
      mode === 'bootstrap'
        ? {
            bootstrap: true,
            secret: String(form.get('secret') ?? ''),
            name: String(form.get('name') ?? ''),
            email: String(form.get('email') ?? ''),
            password: String(form.get('password') ?? ''),
          }
        : {
            email: String(form.get('email') ?? ''),
            password: String(form.get('password') ?? ''),
          };

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not sign in');

      router.replace('/admin');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
      setLoading(false);
    }
  }

  if (mode === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <SpinnerIcon width={26} height={26} style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  const isBootstrap = mode === 'bootstrap';

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
              Homeware &amp; Co
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              Store administration
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="admin-panel p-6">
          <h1 className="text-lg" style={{ color: 'var(--admin-text)' }}>
            {isBootstrap ? 'Create the owner account' : 'Staff sign in'}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--admin-muted)' }}>
            {isBootstrap
              ? 'No staff accounts exist yet. This first one is the owner: unrestricted, and it cannot be suspended or deleted.'
              : 'This area manages orders, stock and pricing. Customer accounts sign in on the storefront.'}
          </p>

          {isBootstrap && (
            <>
              <label htmlFor="secret" className="admin-label mt-6 block">
                Setup password
              </label>
              <input
                id="secret"
                name="secret"
                type="password"
                required
                autoFocus
                className="admin-input mt-1.5"
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
                The ADMIN_PASSWORD from your environment variables. Used once, to prove this is you.
              </p>

              <label htmlFor="name" className="admin-label mt-4 block">
                Your name
              </label>
              <input id="name" name="name" required className="admin-input mt-1.5" />
            </>
          )}

          <label htmlFor="email" className="admin-label mt-4 block">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus={!isBootstrap}
            className="admin-input mt-1.5"
            autoComplete="username"
          />

          <label htmlFor="password" className="admin-label mt-4 block">
            {isBootstrap ? 'Choose a password' : 'Password'}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isBootstrap ? 8 : undefined}
            className="admin-input mt-1.5"
            autoComplete={isBootstrap ? 'new-password' : 'current-password'}
          />
          {isBootstrap && (
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              At least 8 characters.
            </p>
          )}

          {error && (
            <p
              className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed"
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
            {loading ? (
              <SpinnerIcon width={15} height={15} />
            ) : isBootstrap ? (
              'Create owner account'
            ) : (
              'Sign in'
            )}
          </button>

          {!isBootstrap && (
            <p className="mt-4 text-center text-xs">
              <Link href="/admin/forgot" style={{ color: 'var(--admin-accent)' }}>
                Forgot your password?
              </Link>
            </p>
          )}
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
