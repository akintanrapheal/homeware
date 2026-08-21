'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, SpinnerIcon, StarIcon, TrashIcon } from '@/components/icons';
import { formatDate } from '@/lib/format';

interface Review {
  id: string;
  author: string;
  city: string;
  rating: number;
  body: string;
  approved: boolean;
  featured: boolean;
  source: string;
  createdAt: string;
  product: { name: string; slug: string } | null;
}

const BLANK = { productSlug: '', author: '', city: '', rating: 5, body: '' };

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<{ slug: string; name: string }[]>([]);
  const [pending, setPending] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(BLANK);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${filter}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not load reviews');
      setReviews(d.reviews);
      setPending(d.pending);
      setProducts(d.products ?? []);
      setNotice('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Partial<Review>) {
    const previous = reviews;
    setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, ...body } : r)));
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setReviews(previous);
      setNotice('Could not save that change.');
    } else {
      load();
    }
  }

  async function remove(r: Review) {
    if (!window.confirm(`Delete the review by ${r.author}?`)) return;
    const res = await fetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setNotice('Could not delete that review.');
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          productSlug: draft.productSlug || null,
          rating: Number(draft.rating),
          approved: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not add the review');
      setDraft(BLANK);
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not add the review');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Reviews</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Reviews left on the shop arrive unapproved and stay invisible until you approve them.
          Featured ones appear in the home page strip.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="rounded-full px-4 py-2 text-xs font-medium capitalize transition"
            style={
              filter === f
                ? { background: 'color-mix(in oklab, var(--admin-accent) 15%, transparent)', color: 'var(--admin-accent)' }
                : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
            }
          >
            {f}
            {f === 'pending' && pending > 0 ? ` (${pending})` : ''}
          </button>
        ))}
      </div>

      {notice && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)',
            color: 'var(--admin-bad)',
          }}
        >
          {notice}
        </p>
      )}

      <form onSubmit={create} className="admin-panel mb-5 p-5">
        <h2 className="mb-4 text-sm font-semibold">Add a review</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="admin-label">Name</label>
            <input
              required
              value={draft.author}
              onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
              placeholder="Adaeze O."
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">City</label>
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Abuja"
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Product</label>
            <select
              value={draft.productSlug}
              onChange={(e) => setDraft((d) => ({ ...d, productSlug: e.target.value }))}
              className="admin-input mt-1.5"
            >
              <option value="">About the shop</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Rating</label>
            <select
              value={draft.rating}
              onChange={(e) => setDraft((d) => ({ ...d, rating: Number(e.target.value) }))}
              className="admin-input mt-1.5"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="admin-label">Review</label>
          <textarea
            required
            rows={3}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            className="admin-input mt-1.5 resize-y"
          />
        </div>
        <button type="submit" disabled={creating} className="admin-btn admin-btn-primary mt-3 disabled:opacity-60">
          {creating ? <SpinnerIcon width={14} height={14} /> : 'Add review'}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <SpinnerIcon width={24} height={24} style={{ color: 'var(--admin-accent)' }} />
        </div>
      ) : reviews.length === 0 ? (
        <p className="admin-panel p-12 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>
          No reviews here yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="admin-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {r.author}
                    </span>
                    {r.city && (
                      <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>{r.city}</span>
                    )}
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <StarIcon
                          key={n}
                          width={12}
                          height={12}
                          style={{ color: n <= r.rating ? 'var(--admin-warn)' : 'var(--admin-line)' }}
                        />
                      ))}
                    </span>
                    {!r.approved && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.6rem]"
                        style={{
                          color: 'var(--admin-warn)',
                          background: 'color-mix(in oklab, var(--admin-warn) 15%, transparent)',
                        }}
                      >
                        awaiting approval
                      </span>
                    )}
                    {r.source === 'storefront' && (
                      <span className="text-[0.6rem]" style={{ color: 'var(--admin-muted)' }}>
                        from a customer
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm" style={{ color: 'var(--admin-text)' }}>{r.body}</p>
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {r.product ? r.product.name : 'About the shop'} · {formatDate(r.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(r)}
                  aria-label={`Delete review by ${r.author}`}
                  style={{ color: 'var(--admin-muted)' }}
                  className="shrink-0 transition hover:opacity-70"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>

              <div
                className="mt-4 flex flex-wrap gap-2 border-t pt-3"
                style={{ borderColor: 'var(--admin-line)' }}
              >
                <button
                  type="button"
                  onClick={() => patch(r.id, { approved: !r.approved })}
                  className="admin-btn !py-1.5 text-[0.68rem]"
                  style={
                    r.approved
                      ? { background: 'color-mix(in oklab, var(--admin-good) 16%, transparent)', color: 'var(--admin-good)' }
                      : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
                  }
                >
                  <CheckIcon width={13} height={13} />
                  {r.approved ? 'Approved' : 'Approve'}
                </button>

                <button
                  type="button"
                  onClick={() => patch(r.id, { featured: !r.featured })}
                  className="admin-btn !py-1.5 text-[0.68rem]"
                  style={
                    r.featured
                      ? { background: 'color-mix(in oklab, var(--admin-accent) 16%, transparent)', color: 'var(--admin-accent)' }
                      : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
                  }
                >
                  <StarIcon width={13} height={13} />
                  {r.featured ? 'On the home page' : 'Feature on home page'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
