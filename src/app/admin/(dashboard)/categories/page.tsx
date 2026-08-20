'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, SpinnerIcon, TrashIcon } from '@/components/icons';

interface Category {
  id: string;
  slug: string;
  label: string;
  blurb: string;
  group: string;
  shape: string;
  sortOrder: number;
  active: boolean;
  productCount: number;
}

const BLANK = { slug: '', label: '', blurb: '', group: 'kitchen', shape: 'cookware' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [orphans, setOrphans] = useState<{ slug: string; count: number }[]>([]);
  const [shapes, setShapes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(BLANK);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not load categories');
      setCategories(d.categories);
      setOrphans(d.orphans ?? []);
      setShapes(d.shapes ?? []);
      setNotice('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Partial<Category>) {
    const previous = categories;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...body } : c)));
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setCategories(previous);
      const d = await res.json().catch(() => null);
      setNotice(d?.error ?? 'Could not save that change.');
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setNotice('');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, sortOrder: categories.length }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not create the category');
      setDraft(BLANK);
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not create the category');
    } finally {
      setCreating(false);
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Delete “${c.label}”?`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    if (res.ok) load();
    else {
      const d = await res.json().catch(() => null);
      setNotice(d?.error ?? 'Could not delete that category.');
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Categories</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          These drive the shop navigation, the filters and the home page tiles. Hiding a category
          removes it from the storefront without touching its products.
        </p>
      </header>

      {notice && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm leading-relaxed"
          style={{
            background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)',
            color: 'var(--admin-bad)',
          }}
        >
          {notice}
        </p>
      )}

      {orphans.length > 0 && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklab, var(--admin-warn) 12%, transparent)',
            color: 'var(--admin-warn)',
          }}
        >
          <p className="font-medium">Products filed under a category that no longer exists</p>
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {orphans.map((o) => (
              <li key={o.slug}>
                <code>{o.slug}</code> — {o.count} product{o.count === 1 ? '' : 's'}. They will not
                appear in the shop nav until you create that category or move them.
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={create} className="admin-panel mb-5 p-5">
        <h2 className="mb-4 text-sm font-semibold">Add a category</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="admin-label">Name</label>
            <input
              required
              value={draft.label}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  label: e.target.value,
                  slug: d.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                }))
              }
              placeholder="Bakeware"
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Slug</label>
            <input
              required
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="bakeware"
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Group</label>
            <input
              value={draft.group}
              onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}
              placeholder="kitchen"
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label className="admin-label">Silhouette</label>
            <select
              value={draft.shape}
              onChange={(e) => setDraft((d) => ({ ...d, shape: e.target.value }))}
              className="admin-input mt-1.5"
            >
              {(shapes.length ? shapes : ['cookware']).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={creating} className="admin-btn admin-btn-primary w-full disabled:opacity-60">
              {creating ? <SpinnerIcon width={14} height={14} /> : 'Add'}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <label className="admin-label">Blurb (shown on the home page tile)</label>
          <input
            value={draft.blurb}
            onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
            placeholder="Tins and trays that survive a hot oven."
            className="admin-input mt-1.5"
          />
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <SpinnerIcon width={24} height={24} style={{ color: 'var(--admin-accent)' }} />
        </div>
      ) : (
        <div className="admin-panel overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--admin-line)', color: 'var(--admin-muted)' }}>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">Order</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Blurb</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Group</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Products</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Visible</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b" style={{ borderColor: 'var(--admin-line)' }}>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={c.sortOrder}
                      onBlur={(e) => {
                        const sortOrder = Number(e.target.value);
                        if (Number.isFinite(sortOrder) && sortOrder !== c.sortOrder) patch(c.id, { sortOrder });
                      }}
                      className="admin-input w-16"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      defaultValue={c.label}
                      onBlur={(e) => {
                        const label = e.target.value.trim();
                        if (label && label !== c.label) patch(c.id, { label });
                      }}
                      className="admin-input w-40"
                    />
                    <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>{c.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      defaultValue={c.blurb}
                      onBlur={(e) => {
                        const blurb = e.target.value.trim();
                        if (blurb !== c.blurb) patch(c.id, { blurb });
                      }}
                      className="admin-input w-64"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      defaultValue={c.group}
                      onBlur={(e) => {
                        const group = e.target.value.trim();
                        if (group && group !== c.group) patch(c.id, { group });
                      }}
                      className="admin-input w-24"
                    />
                  </td>
                  <td className="px-3 py-3" style={{ color: 'var(--admin-text)' }}>{c.productCount}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => patch(c.id, { active: !c.active })}
                      aria-label={`Toggle visibility for ${c.label}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md transition"
                      style={
                        c.active
                          ? { background: 'color-mix(in oklab, var(--admin-accent) 18%, transparent)', color: 'var(--admin-accent)' }
                          : { border: '1px solid var(--admin-line)', color: 'transparent' }
                      }
                    >
                      <CheckIcon width={14} height={14} />
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      aria-label={`Delete ${c.label}`}
                      style={{ color: 'var(--admin-muted)' }}
                      className="transition hover:opacity-70"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
