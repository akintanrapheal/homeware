'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminImagePicker } from './admin-image-picker';
import { SpinnerIcon } from './icons';
import { discountPercent, formatNaira } from '@/lib/format';
import type { Accent } from '@/lib/types';

const ACCENTS: Accent[] = ['clay', 'sage', 'sand', 'slate', 'copper', 'ink'];

interface Draft {
  name: string;
  slug: string;
  brand: string;
  category: string;
  family: string;
  description: string;
  sizeLabel: string;
  specs: string;
  care: string;
  inBox: string;
  price: string;
  compareAt: string;
  stock: string;
  imageUrl: string | null;
  accent: Accent;
  featured: boolean;
  bestseller: boolean;
}

const EMPTY: Draft = {
  name: '',
  slug: '',
  brand: 'Homeware & Co',
  category: '',
  family: '',
  description: '',
  sizeLabel: '',
  specs: '',
  care: '',
  inBox: '',
  price: '',
  compareAt: '',
  stock: '0',
  imageUrl: null,
  accent: 'clay',
  featured: false,
  bestseller: false,
};

/** "a\nb\nc" → ['a','b','c'], dropping blank lines. */
const toList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function AdminProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [categories, setCategories] = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Once the slug has been set by hand, stop rewriting it from the name — a
  // published URL should not change because someone fixed a typo in the title.
  const [slugLocked, setSlugLocked] = useState(isEdit);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? 'Could not load product');
        const p = d.product;
        setDraft({
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          category: p.category,
          family: p.family,
          description: p.description,
          sizeLabel: p.sizeLabel ?? '',
          specs: (p.specs ?? []).join('\n'),
          care: (p.care ?? []).join('\n'),
          inBox: (p.inBox ?? []).join('\n'),
          price: String(p.price),
          compareAt: p.compareAt ? String(p.compareAt) : '',
          stock: String(p.stock),
          imageUrl: p.imageUrl,
          accent: p.accent,
          featured: p.featured,
          bestseller: p.bestseller,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [productId]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');

    const price = Number(draft.price);
    const compareAt = draft.compareAt.trim() === '' ? null : Number(draft.compareAt);

    if (compareAt !== null && compareAt <= price) {
      setError('The was-price must be higher than the sales price, or left empty.');
      setSaving(false);
      return;
    }

    const body = {
      name: draft.name.trim(),
      slug: draft.slug.trim() || slugify(draft.name),
      brand: draft.brand.trim(),
      category: draft.category,
      family: draft.family.trim(),
      description: draft.description.trim(),
      sizeLabel: draft.sizeLabel.trim() || null,
      specs: toList(draft.specs),
      care: toList(draft.care),
      inBox: toList(draft.inBox),
      price,
      compareAt,
      stock: Number(draft.stock),
      imageUrl: draft.imageUrl,
      accent: draft.accent,
      featured: draft.featured,
      bestseller: draft.bestseller,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${productId}` : '/api/admin/products',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not save the product');
      router.push('/admin/products');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the product');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <SpinnerIcon width={24} height={24} style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  const off = discountPercent(Number(draft.price) || 0, draft.compareAt ? Number(draft.compareAt) : null);

  return (
    <form onSubmit={save} className="space-y-5 pb-16">
      <section className="admin-panel p-5">
        <h2 className="mb-4 text-sm font-semibold">Photo</h2>
        <AdminImagePicker
          value={draft.imageUrl}
          onChange={(url) => set('imageUrl', url)}
          category={draft.category || 'cookware'}
          accent={draft.accent}
        />
      </section>

      <section className="admin-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold">Basics</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="admin-label">Name</label>
            <input
              id="name"
              required
              value={draft.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (!slugLocked) set('slug', slugify(e.target.value));
              }}
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="slug" className="admin-label">URL slug</label>
            <input
              id="slug"
              required
              value={draft.slug}
              onChange={(e) => {
                setSlugLocked(true);
                set('slug', e.target.value);
              }}
              className="admin-input mt-1.5"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              /product/{draft.slug || 'your-product'}
            </p>
          </div>

          <div>
            <label htmlFor="category" className="admin-label">Category</label>
            <select
              id="category"
              required
              value={draft.category}
              onChange={(e) => set('category', e.target.value)}
              className="admin-input mt-1.5"
            >
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="family" className="admin-label">Material</label>
            <input
              id="family"
              required
              value={draft.family}
              onChange={(e) => set('family', e.target.value)}
              placeholder="cast iron, stoneware, linen…"
              className="admin-input mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="sizeLabel" className="admin-label">Size label</label>
            <input
              id="sizeLabel"
              value={draft.sizeLabel}
              onChange={(e) => set('sizeLabel', e.target.value)}
              placeholder="24cm · 4.2L"
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="brand" className="admin-label">Brand</label>
            <input
              id="brand"
              value={draft.brand}
              onChange={(e) => set('brand', e.target.value)}
              className="admin-input mt-1.5"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="admin-label">Description</label>
          <textarea
            id="description"
            required
            rows={4}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            className="admin-input mt-1.5 resize-y"
          />
        </div>
      </section>

      <section className="admin-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold">Price &amp; stock</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price" className="admin-label">Sales price ₦</label>
            <input
              id="price"
              type="number"
              required
              min={100}
              value={draft.price}
              onChange={(e) => set('price', e.target.value)}
              className="admin-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="compareAt" className="admin-label">Was price ₦</label>
            <input
              id="compareAt"
              type="number"
              min={0}
              placeholder="optional"
              value={draft.compareAt}
              onChange={(e) => set('compareAt', e.target.value)}
              className="admin-input mt-1.5"
            />
            <p className="mt-1 text-xs" style={{ color: off ? 'var(--admin-good)' : 'var(--admin-muted)' }}>
              {off ? `Shows a −${off}% badge` : 'Leave empty for no discount'}
            </p>
          </div>
          <div>
            <label htmlFor="stock" className="admin-label">Stock</label>
            <input
              id="stock"
              type="number"
              required
              min={0}
              value={draft.stock}
              onChange={(e) => set('stock', e.target.value)}
              className="admin-input mt-1.5"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              {Number(draft.stock) === 0 ? 'Shows as sold out' : `${draft.stock} available`}
            </p>
          </div>
        </div>
        {draft.price && (
          <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
            Customers see {formatNaira(Number(draft.price) || 0)}
            {off ? `, down from ${formatNaira(Number(draft.compareAt))}` : ''}.
          </p>
        )}
      </section>

      <section className="admin-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold">Details</h2>
        <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
          One item per line. These become the Specification, In the box and Care lists on the
          product page; leave a box empty to hide that section.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {([
            ['specs', 'Specification', '24cm diameter · 4.2 litre'],
            ['inBox', 'In the box', '24cm casserole'],
            ['care', 'Care', 'Hand wash with warm soapy water'],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key}>
              <label htmlFor={key} className="admin-label">{label}</label>
              <textarea
                id={key}
                rows={5}
                value={draft[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="admin-input mt-1.5 resize-y font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold">Presentation</h2>
        <div>
          <span className="admin-label">Accent colour</span>
          <p className="mb-2 mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
            Tints the generated silhouette when there is no photo.
          </p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set('accent', a)}
                className="rounded-md px-3 py-1.5 text-xs capitalize transition"
                style={
                  draft.accent === a
                    ? { background: 'color-mix(in oklab, var(--admin-accent) 18%, transparent)', color: 'var(--admin-accent)' }
                    : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
                }
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          {([['featured', 'Featured on the home page'], ['bestseller', 'Show a bestseller badge']] as const).map(
            ([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ),
          )}
        </div>
      </section>

      {error && (
        <p
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklab, var(--admin-bad) 12%, transparent)',
            color: 'var(--admin-bad)',
          }}
        >
          {error}
        </p>
      )}

      <div
        className="sticky bottom-0 flex gap-3 border-t py-4 pb-safe"
        style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-bg)' }}
      >
        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
          {saving ? <SpinnerIcon width={14} height={14} /> : isEdit ? 'Save changes' : 'Create product'}
        </button>
        <Link href="/admin/products" className="admin-btn admin-btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
