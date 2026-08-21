'use client';

import { useState } from 'react';
import { CheckIcon, SpinnerIcon, StarIcon } from './icons';

interface Review {
  id: string;
  author: string;
  city: string;
  rating: number;
  body: string;
  createdAt: string | Date;
}

/**
 * Reviews for one product, plus the form to leave one.
 *
 * Submissions are held for approval, and the form says so before anyone types —
 * finding out afterwards that a review is invisible reads as the site having
 * swallowed it.
 */
export function ProductReviews({
  productSlug,
  productName,
  reviews,
}: {
  productSlug: string;
  productName: string;
  reviews: Review[];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;

    const form = new FormData(event.currentTarget);
    setState('sending');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug,
          author: String(form.get('author') ?? ''),
          city: String(form.get('city') ?? ''),
          rating,
          body: String(form.get('body') ?? ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not send your review');
      setMessage(data.message);
      setState('done');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not send your review');
      setState('idle');
    }
  }

  return (
    <section className="mt-16 border-t border-paper-300 pt-12 sm:mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Reviews</p>
          <h2 className="font-display text-3xl text-ink-900 sm:text-4xl">
            {reviews.length > 0 ? 'What owners say' : 'Be the first to review this'}
          </h2>
        </div>
        {!open && state !== 'done' && (
          <button type="button" onClick={() => setOpen(true)} className="btn btn-outline">
            Write a review
          </button>
        )}
      </div>

      {state === 'done' ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-100">
            <CheckIcon width={22} height={22} className="text-clay-600" />
          </div>
          <p className="max-w-sm text-sm text-ink-600">{message}</p>
        </div>
      ) : (
        open && (
          <form onSubmit={submit} className="card mb-8 space-y-5 p-6 sm:p-8">
            <p className="text-sm text-ink-600">
              Reviewing <span className="text-ink-900">{productName}</span>. We read every one
              before it appears, so it will not show straight away.
            </p>

            <div>
              <span className="label">Your rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    className="tap-sm"
                  >
                    <StarIcon
                      width={22}
                      height={22}
                      className={n <= rating ? 'text-clay-500' : 'text-paper-400'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="author" className="label">Your name</label>
                <input id="author" name="author" required className="field" />
              </div>
              <div>
                <label htmlFor="city" className="label">City (optional)</label>
                <input id="city" name="city" className="field" placeholder="Lagos" />
              </div>
            </div>

            <div>
              <label htmlFor="body" className="label">Your review</label>
              <textarea id="body" name="body" rows={4} required className="field resize-y" />
            </div>

            {message && state === 'idle' && (
              <p className="text-xs text-rose-accent">{message}</p>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={state === 'sending'} className="btn btn-clay disabled:opacity-60">
                {state === 'sending' ? <SpinnerIcon width={16} height={16} /> : 'Send review'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        )
      )}

      {reviews.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="card p-6">
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon
                    key={n}
                    width={13}
                    height={13}
                    className={n <= r.rating ? 'text-clay-500' : 'text-paper-400'}
                  />
                ))}
              </div>
              <blockquote className="font-display text-lg italic leading-relaxed text-ink-800">
                “{r.body}”
              </blockquote>
              <p className="mt-4 border-t border-paper-200 pt-3 text-xs text-ink-500">
                <span className="text-ink-900">{r.author}</span>
                {r.city ? ` · ${r.city}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
