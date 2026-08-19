'use client';

import { useState } from 'react';
import { ArrowRightIcon, CheckIcon, SpinnerIcon } from './icons';

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'loading') return;

    const form = new FormData(event.currentTarget);
    setState('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          subject: String(form.get('subject') ?? ''),
          body: String(form.get('body') ?? ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not send your message');

      setState('done');
      setMessage(data.message);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    }
  }

  if (state === 'done') {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-clay-300 bg-clay-100">
          <CheckIcon width={24} height={24} className="text-clay-600" />
        </div>
        <p className="font-display text-2xl font-light text-ink-900">Message sent</p>
        <p className="max-w-xs text-sm text-ink-600">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" required className="field" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="contact-email" className="label">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className="field"
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="label">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          required
          placeholder="Order enquiry, wholesale, a recommendation…"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="body" className="label">
          Message
        </label>
        <textarea id="body" name="body" rows={5} required className="field resize-none" />
      </div>

      {state === 'error' && (
        <p className="rounded-xl border border-rose-accent/40 bg-rose-accent/8 px-4 py-3 text-xs text-rose-accent">
          {message}
        </p>
      )}

      <button type="submit" disabled={state === 'loading'} className="btn btn-clay w-full disabled:opacity-60">
        {state === 'loading' ? (
          <>
            <SpinnerIcon width={16} height={16} />
            Sending…
          </>
        ) : (
          <>
            Send message
            <ArrowRightIcon width={16} height={16} />
          </>
        )}
      </button>

      <p className="text-center text-[0.7rem] text-ink-500">
        We reply within one business day — usually much sooner on WhatsApp.
      </p>
    </form>
  );
}
