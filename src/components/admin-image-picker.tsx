'use client';

import { useRef, useState } from 'react';
import { ProductArt } from './product-art';
import { CloseIcon, SpinnerIcon } from './icons';
import type { Accent } from '@/lib/types';

/**
 * Product photography. Two routes on purpose: upload a file when Blob storage is
 * configured, or paste a URL, which needs no setup at all. Either way the
 * preview shows exactly what the shop will render — including the generated
 * silhouette that stands in when there is no photo.
 */
export function AdminImagePicker({
  value,
  onChange,
  category,
  accent,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  category: string;
  accent: Accent;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [urlDraft, setUrlDraft] = useState('');

  async function upload(file: File) {
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      onChange(data.url);
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Product preview" className="h-full w-full object-cover" />
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
            <ProductArt category={category} accent={accent} className="h-full w-full" />
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
              looks finished.
            </p>
          )}
        </div>
      </div>

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
    </div>
  );
}
