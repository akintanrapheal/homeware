'use client';

import { useState } from 'react';
import { ArrowRightIcon, CheckIcon, SpinnerIcon } from './icons';

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'loading') return;
    setState('loading');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Something went wrong');
      setState('done');
      setMessage(data.message ?? 'You are on the list.');
      setEmail('');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    }
  }

  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 text-sm text-clay-600">
        <CheckIcon width={16} height={16} />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? '' : 'max-w-md'}>
      <div className="flex items-center gap-2 rounded-full border border-paper-300 bg-white p-1.5 pl-5 transition focus-within:border-clay-500">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          placeholder="Your email address"
          aria-label="Email address"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="btn btn-clay shrink-0 !px-5 !py-2.5 text-[0.65rem] disabled:opacity-60"
        >
          {state === 'loading' ? (
            <SpinnerIcon width={14} height={14} />
          ) : (
            <>
              Join
              <ArrowRightIcon width={14} height={14} />
            </>
          )}
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-xs text-rose-accent">{message}</p>}
    </form>
  );
}
