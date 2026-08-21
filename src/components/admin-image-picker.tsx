'use client';

import { useRef, useState } from 'react';
import { ProductArt } from './product-art';
import { CheckIcon, CloseIcon, SpinnerIcon } from './icons';
import type { Accent } from '@/lib/types';

/**
 * Product photography. Two routes on purpose: upload a file when Blob storage is
 * configured, or paste a URL, which needs no setup at all. Either way the
 * preview shows exactly what the shop will render — including the generated
 * silhouette that stands in when there is no photo.
 */
/** The silhouettes on offer, in the order they read best as a set. */
export const ART_SHAPES: { id: string; label: string }[] = [
  { id: 'cookware', label: 'Pot' },
  { id: 'knives', label: 'Knife' },
  { id: 'appliances', label: 'Kettle' },
  { id: 'tableware', label: 'Plates' },
  { id: 'glassware', label: 'Glassware' },
  { id: 'storage', label: 'Jar' },
  { id: 'textiles', label: 'Linen' },
];

export function AdminImagePicker({
  value,
  onChange,
  category,
  accent,
  shape,
  onShapeChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  category: string;
  accent: Accent;
  /** Chosen silhouette, or null to follow the category. */
  shape?: string | null;
  onShapeChange?: (shape: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [urlDraft, setUrlDraft] = useState('');

  async function upload(file: File) {
    setUploading(true);
    setError('');
    setDone('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        // Keep the provider's own words: "payload too large" and "bad
        // credentials" need different fixes, and collapsing them into one
        // message sends people down the wrong path.
        throw new Error(data?.detail ? `${data.error} (${data.detail})` : (data?.error ?? 'Upload failed'));
      }
      onChange(data.url);
      // Swapping the preview is easy to miss on a long form; say it plainly.
      setDone(`Uploaded ${file.name} (${(file.size / 1024).toFixed(0)} KB).`);
      window.setTimeout(() => setDone(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          className="relative h-40 w-40 shrink-0 overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--admin-line)', background: '#fff' }}
        >
          {value ? (
            <>
              {/* Matches how the shop renders it, so the preview is honest. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Product preview" className="h-full w-full object-contain p-[8%]" />
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </>
          ) : (
            <ProductArt
              category={category}
              accent={accent}
              shape={shape ?? undefined}
              className="h-full w-full"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="admin-btn admin-btn-primary disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <SpinnerIcon width={14} height={14} />
                  Uploading…
                </>
              ) : (
                'Upload a photo'
              )}
            </button>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--admin-muted)' }}>
              JPEG, PNG, WebP or AVIF. Up to 4MB. Square photos crop best.
            </p>
          </div>

          <div>
            <label className="admin-label">or paste an image URL</label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://…"
                className="admin-input"
              />
              <button
                type="button"
                onClick={() => {
                  const u = urlDraft.trim();
                  if (!u) return;
                  onChange(u);
                  setUrlDraft('');
                  setError('');
                  setDone('Image URL applied.');
                  window.setTimeout(() => setDone(''), 4000);
                }}
                className="admin-btn admin-btn-ghost shrink-0"
              >
                Use
              </button>
            </div>
          </div>

          {!value && (
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              With no photo the shop draws the silhouette shown on the left, so the grid still
              looks finished. Pick a different one below if it suits the product better.
            </p>
          )}
        </div>
      </div>

      {/*
        Only offered when there is no photograph: once a real image exists the
        silhouette is never drawn, and showing a chooser for something invisible
        is just a puzzle.
      */}
      {!value && onShapeChange && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--admin-line)' }}>
          <span className="admin-label">Placeholder silhouette</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onShapeChange(null)}
              className="flex w-20 flex-col items-center gap-1 rounded-lg border p-1.5 transition"
              style={
                !shape
                  ? { borderColor: 'var(--admin-accent)', background: 'color-mix(in oklab, var(--admin-accent) 8%, transparent)' }
                  : { borderColor: 'var(--admin-line)' }
              }
            >
              <span className="h-14 w-full overflow-hidden rounded">
                <ProductArt category={category} accent={accent} className="h-full w-full" />
              </span>
              <span className="text-[0.62rem]" style={{ color: 'var(--admin-muted)' }}>
                Auto
              </span>
            </button>

            {ART_SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onShapeChange(s.id)}
                className="flex w-20 flex-col items-center gap-1 rounded-lg border p-1.5 transition"
                style={
                  shape === s.id
                    ? { borderColor: 'var(--admin-accent)', background: 'color-mix(in oklab, var(--admin-accent) 8%, transparent)' }
                    : { borderColor: 'var(--admin-line)' }
                }
              >
                <span className="h-14 w-full overflow-hidden rounded">
                  <ProductArt category={category} accent={accent} shape={s.id} className="h-full w-full" />
                </span>
                <span className="text-[0.62rem]" style={{ color: 'var(--admin-muted)' }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--admin-muted)' }}>
            Auto follows the product&apos;s category. The accent colour above tints whichever you
            pick.
          </p>
        </div>
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

      {done && !error && (
        <p
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: 'color-mix(in oklab, var(--admin-good) 14%, transparent)',
            color: 'var(--admin-good)',
          }}
        >
          <CheckIcon width={14} height={14} />
          {done} Remember to save the product.
        </p>
      )}
    </div>
  );
}
