'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, SpinnerIcon, TrashIcon } from '@/components/icons';
import { discountPercent, formatNaira } from '@/lib/format';
import { CATEGORIES, CATEGORY_LABEL, type CategoryId } from '@/lib/types';

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  price: number;
  compareAt: number | null;
  stock: number;
  featured: boolean;
  bestseller: boolean;
  imageUrl: string | null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | CategoryId>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not load products');
      setProducts(data.products);
      setNotice('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Partial<AdminProduct>) {
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...body } : p)));
    setSavingId(id);

    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSavingId(null);
    if (!res.ok) {
      setProducts(previous);
      const d = await res.json().catch(() => null);
      setNotice(d?.error ?? 'Could not save that change.');
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    else setNotice('Could not delete that product.');
  }

  const term = search.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (term && !`${p.name} ${p.slug}`.toLowerCase().includes(term)) return false;
    return true;
  });

  const onSale = products.filter((p) => p.compareAt && p.compareAt > p.price).length;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Products</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Edit a field and click away to save. <strong>Sales price</strong> is what the customer
          pays; <strong>was price</strong> is the struck-through figure that creates the discount
          badge — leave it empty for no discount.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="admin-input max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as 'all' | CategoryId)}
          className="admin-input w-auto"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
          {visible.length} shown · {onSale} on sale
        </span>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <SpinnerIcon width={24} height={24} style={{ color: 'var(--admin-accent)' }} />
        </div>
      ) : (
        <div className="admin-panel overflow-x-auto">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: 'var(--admin-line)', color: 'var(--admin-muted)' }}
              >
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">Product</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Sales price ₦</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Was price ₦</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Off</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Stock</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Feat.</th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider">Best</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const off = discountPercent(p.price, p.compareAt);
                return (
                  <tr key={p.id} className="border-b" style={{ borderColor: 'var(--admin-line)' }}>
                    <td className="px-4 py-3">
                      <p style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                        {CATEGORY_LABEL[p.category]} · {p.slug}
                      </p>
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={100}
                        defaultValue={p.price}
                        onBlur={(e) => {
                          const price = Number(e.target.value);
                          if (Number.isFinite(price) && price >= 100 && price !== p.price) {
                            patch(p.id, { price });
                          }
                        }}
                        className="admin-input w-28"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        placeholder="—"
                        defaultValue={p.compareAt ?? ''}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const compareAt = raw === '' ? null : Number(raw);
                          if (compareAt !== null && !Number.isFinite(compareAt)) return;
                          if (compareAt !== p.compareAt) patch(p.id, { compareAt });
                        }}
                        className="admin-input w-28"
                      />
                    </td>

                    <td className="px-3 py-3">
                      {off !== null ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-xs font-semibold"
                          style={{
                            color: 'var(--admin-good)',
                            background: 'color-mix(in oklab, var(--admin-good) 15%, transparent)',
                          }}
                        >
                          −{off}%
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        onBlur={(e) => {
                          const stock = Number(e.target.value);
                          if (Number.isFinite(stock) && stock >= 0 && stock !== p.stock) {
                            patch(p.id, { stock });
                          }
                        }}
                        className="admin-input w-20"
                        style={p.stock === 0 ? { borderColor: 'var(--admin-bad)' } : undefined}
                      />
                    </td>

                    {(['featured', 'bestseller'] as const).map((flag) => (
                      <td key={flag} className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => patch(p.id, { [flag]: !p[flag] })}
                          aria-label={`Toggle ${flag} for ${p.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition"
                          style={
                            p[flag]
                              ? {
                                  background: 'color-mix(in oklab, var(--admin-accent) 20%, transparent)',
                                  color: 'var(--admin-accent)',
                                }
                              : { border: '1px solid var(--admin-line)', color: 'transparent' }
                          }
                        >
                          <CheckIcon width={14} height={14} />
                        </button>
                      </td>
                    ))}

                    <td className="px-3 py-3 text-right">
                      {savingId === p.id ? (
                        <SpinnerIcon width={15} height={15} style={{ color: 'var(--admin-accent)' }} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => remove(p.id, p.name)}
                          aria-label={`Delete ${p.name}`}
                          style={{ color: 'var(--admin-muted)' }}
                          className="transition hover:opacity-70"
                        >
                          <TrashIcon width={16} height={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: 'var(--admin-muted)' }}>
        Price changes appear on the storefront within about two minutes — product pages are cached
        for speed. The shop grid and checkout always read live figures.
      </p>
    </>
  );
}
