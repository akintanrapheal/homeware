'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, SpinnerIcon, TrashIcon } from '@/components/icons';
import { formatNaira } from '@/lib/format';

interface Settings {
  storeName: string;
  tagline: string;
  description: string;
  announcement: string;
  whatsapp: string;
  email: string;
  phone: string;
  instagram: string;
  tiktok: string;
  address: string;
  hours: string;
  freeDeliveryThreshold: number;
  paystackPublicKey: string | null;
  paystackEnabled: boolean;
  emailFrom: string | null;
  emailReplyTo: string | null;
  emailOnOrder: boolean;
  notifyStore: boolean;
  hasPaystackSecret: boolean;
  hasEmailApiKey: boolean;
  paystackSecretFromEnv?: boolean;
  emailKeyFromEnv?: boolean;
}

interface Zone {
  id: string;
  slug: string;
  label: string;
  fee: number;
  sortOrder: number;
  active: boolean;
}

type Tab = 'store' | 'delivery' | 'payments' | 'email';

const TABS: { id: Tab; label: string }[] = [
  { id: 'store', label: 'Storefront' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'payments', label: 'Payments' },
  { id: 'email', label: 'Email' },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('store');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [canImport, setCanImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState('');
  const [secrets, setSecrets] = useState({ paystackSecretKey: '', emailApiKey: '' });
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [newZone, setNewZone] = useState({ slug: '', label: '', fee: '' });

  const load = useCallback(async () => {
    try {
      const [s, z] = await Promise.all([
        fetch('/api/admin/settings').then((r) => r.json()),
        fetch('/api/admin/zones').then((r) => r.json()),
      ]);
      if (s.error) throw new Error(s.error);
      setSettings(s.settings);
      setZones(z.zones ?? []);
      setCanImport((z.defaults ?? []).length > 0);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!settings || saving) return;
    setSaving(true);
    setNotice('');

    const body: Record<string, unknown> = {
      storeName: settings.storeName,
      tagline: settings.tagline,
      description: settings.description,
      announcement: settings.announcement,
      whatsapp: settings.whatsapp,
      email: settings.email,
      phone: settings.phone,
      instagram: settings.instagram,
      tiktok: settings.tiktok,
      address: settings.address,
      hours: settings.hours,
      freeDeliveryThreshold: Number(settings.freeDeliveryThreshold) || 0,
      paystackPublicKey: settings.paystackPublicKey ?? '',
      paystackEnabled: settings.paystackEnabled,
      emailFrom: settings.emailFrom ?? '',
      emailReplyTo: settings.emailReplyTo ?? '',
      emailOnOrder: settings.emailOnOrder,
      notifyStore: settings.notifyStore,
    };
    // Blank means "unchanged" for secrets — the form can never show them.
    if (secrets.paystackSecretKey) body.paystackSecretKey = secrets.paystackSecretKey;
    if (secrets.emailApiKey) body.emailApiKey = secrets.emailApiKey;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Could not save');
      setSettings(d.settings);
      setSecrets({ paystackSecretKey: '', emailApiKey: '' });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function patchZone(id: string, body: Partial<Zone>) {
    const previous = zones;
    setZones((z) => z.map((x) => (x.id === id ? { ...x, ...body } : x)));
    const res = await fetch(`/api/admin/zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setZones(previous);
      setNotice('Could not save that zone.');
    }
  }

  async function addZone(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch('/api/admin/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: newZone.slug,
        label: newZone.label,
        fee: Number(newZone.fee) || 0,
        sortOrder: zones.length,
      }),
    });
    if (res.ok) {
      setNewZone({ slug: '', label: '', fee: '' });
      load();
    } else {
      const d = await res.json().catch(() => null);
      setNotice(d?.error ?? 'Could not add that zone.');
    }
  }

  async function sendTest() {
    setTesting(true);
    setNotice('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testTo }),
      });
      const d = await res.json();
      setNotice(res.ok ? d.message : d.error);
    } finally {
      setTesting(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon width={26} height={26} style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  const field = (
    label: string,
    key: keyof Settings,
    placeholder?: string,
    help?: string,
  ) => (
    <div>
      <label className="admin-label">{label}</label>
      <input
        value={(settings[key] as string) ?? ''}
        onChange={(e) => set(key, e.target.value as Settings[typeof key])}
        placeholder={placeholder}
        className="admin-input mt-1.5"
      />
      {help && (
        <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
          {help}
        </p>
      )}
    </div>
  );

  const toggle = (label: string, key: keyof Settings, help?: string) => (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={Boolean(settings[key])}
        onChange={(e) => set(key, e.target.checked as Settings[typeof key])}
        className="mt-0.5 h-4 w-4"
      />
      <span>
        {label}
        {help && (
          <span className="mt-0.5 block text-xs" style={{ color: 'var(--admin-muted)' }}>
            {help}
          </span>
        )}
      </span>
    </label>
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          Anything left blank falls back to the value built into the site, so you can change one
          thing without filling in the rest.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="rounded-full px-4 py-2 text-xs font-medium transition"
            style={
              tab === t.id
                ? { background: 'color-mix(in oklab, var(--admin-accent) 15%, transparent)', color: 'var(--admin-accent)' }
                : { border: '1px solid var(--admin-line)', color: 'var(--admin-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklab, var(--admin-accent) 10%, transparent)',
            color: 'var(--admin-text)',
          }}
        >
          {notice}
        </p>
      )}

      {tab === 'store' && (
        <div className="admin-panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Store name', 'storeName')}
            {field('Tagline', 'tagline')}
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea
              rows={3}
              value={settings.description}
              onChange={(e) => set('description', e.target.value)}
              className="admin-input mt-1.5 resize-y"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              Used for search results and link previews.
            </p>
          </div>
          {field(
            'Announcement bar',
            'announcement',
            'Free delivery on orders over ₦120,000 · Nationwide',
            'The strip across the top of the shop. Leave empty to use the default.',
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {field('WhatsApp number', 'whatsapp', '09060237909', 'Any format — it is normalised for wa.me links.')}
            {field('Phone (displayed)', 'phone', '+234 906 023 7909')}
            {field('Email', 'email', 'hello@homewareandco.com', 'Also where order notifications are sent.')}
            {field('Opening hours', 'hours', 'Mon – Sat, 9am – 6pm WAT')}
            {field('Instagram URL', 'instagram')}
            {field('TikTok URL', 'tiktok')}
          </div>
          {field('Address', 'address', 'Lekki Phase 1, Lagos, Nigeria')}
        </div>
      )}

      {tab === 'delivery' && (
        <div className="space-y-4">
          <div className="admin-panel p-5">
            <label className="admin-label">Free delivery from ₦</label>
            <input
              type="number"
              min={0}
              value={settings.freeDeliveryThreshold}
              onChange={(e) => set('freeDeliveryThreshold', Number(e.target.value))}
              className="admin-input mt-1.5 max-w-xs"
            />
            <p className="mt-1.5 text-xs" style={{ color: 'var(--admin-muted)' }}>
              Orders at or above {formatNaira(Number(settings.freeDeliveryThreshold) || 0)} ship free
              to every zone.
            </p>
          </div>

          <div className="admin-panel p-5">
            <h2 className="mb-1 text-sm font-semibold">Delivery zones</h2>
            <p className="mb-4 text-xs" style={{ color: 'var(--admin-muted)' }}>
              What the customer picks at checkout. Past orders keep the zone name they were placed
              with, so changing these never rewrites history.
            </p>

            {canImport && zones.length === 0 && (
              <div className="mb-4 rounded-lg p-4" style={{ background: 'var(--admin-panel-2)' }}>
                <p className="text-sm">You are using the built-in zones. Import them to edit.</p>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/admin/zones', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ importDefaults: true }),
                    });
                    load();
                  }}
                  className="admin-btn admin-btn-primary mt-3"
                >
                  Import the default zones
                </button>
              </div>
            )}

            {zones.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--admin-line)', color: 'var(--admin-muted)' }}>
                      <th className="py-2 pr-3 text-xs font-medium uppercase">Order</th>
                      <th className="py-2 pr-3 text-xs font-medium uppercase">Zone</th>
                      <th className="py-2 pr-3 text-xs font-medium uppercase">Fee ₦</th>
                      <th className="py-2 pr-3 text-xs font-medium uppercase">Shown</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z) => (
                      <tr key={z.id} className="border-b" style={{ borderColor: 'var(--admin-line)' }}>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            defaultValue={z.sortOrder}
                            onBlur={(e) => {
                              const sortOrder = Number(e.target.value);
                              if (sortOrder !== z.sortOrder) patchZone(z.id, { sortOrder });
                            }}
                            className="admin-input w-16"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            defaultValue={z.label}
                            onBlur={(e) => {
                              const label = e.target.value.trim();
                              if (label && label !== z.label) patchZone(z.id, { label });
                            }}
                            className="admin-input w-56"
                          />
                          <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>{z.slug}</p>
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            defaultValue={z.fee}
                            onBlur={(e) => {
                              const fee = Number(e.target.value);
                              if (Number.isFinite(fee) && fee !== z.fee) patchZone(z.id, { fee });
                            }}
                            className="admin-input w-28"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => patchZone(z.id, { active: !z.active })}
                            aria-label={`Toggle ${z.label}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md transition"
                            style={
                              z.active
                                ? { background: 'color-mix(in oklab, var(--admin-accent) 18%, transparent)', color: 'var(--admin-accent)' }
                                : { border: '1px solid var(--admin-line)', color: 'transparent' }
                            }
                          >
                            <CheckIcon width={14} height={14} />
                          </button>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Remove “${z.label}”?`)) return;
                              await fetch(`/api/admin/zones/${z.id}`, { method: 'DELETE' });
                              load();
                            }}
                            aria-label={`Delete ${z.label}`}
                            style={{ color: 'var(--admin-muted)' }}
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

            <form onSubmit={addZone} className="mt-4 grid gap-3 sm:grid-cols-4">
              <input
                required
                value={newZone.label}
                onChange={(e) =>
                  setNewZone((z) => ({
                    ...z,
                    label: e.target.value,
                    slug: z.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                  }))
                }
                placeholder="Zone name"
                className="admin-input"
              />
              <input
                required
                value={newZone.slug}
                onChange={(e) => setNewZone((z) => ({ ...z, slug: e.target.value }))}
                placeholder="slug"
                className="admin-input"
              />
              <input
                required
                type="number"
                min={0}
                value={newZone.fee}
                onChange={(e) => setNewZone((z) => ({ ...z, fee: e.target.value }))}
                placeholder="Fee ₦"
                className="admin-input"
              />
              <button type="submit" className="admin-btn admin-btn-ghost">Add zone</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="admin-panel space-y-4 p-5">
          <h2 className="text-sm font-semibold">Paystack</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-muted)' }}>
            Card, transfer and USSD in Naira. Without keys the card option is hidden at checkout and
            WhatsApp remains the only route — which is a working shop, not a broken one.
          </p>

          {field('Public key', 'paystackPublicKey', 'pk_live_…')}

          <div>
            <label className="admin-label">Secret key</label>
            <input
              type="password"
              value={secrets.paystackSecretKey}
              onChange={(e) => setSecrets((s) => ({ ...s, paystackSecretKey: e.target.value }))}
              placeholder={
                settings.hasPaystackSecret
                  ? 'Saved — type to replace'
                  : settings.paystackSecretFromEnv
                    ? 'Set via environment variable'
                    : 'sk_live_…'
              }
              className="admin-input mt-1.5"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-muted)' }}>
              Never shown again once saved. Leave blank to keep the current key.
            </p>
          </div>

          {toggle(
            'Offer card payment at checkout',
            'paystackEnabled',
            'Only takes effect once a secret key exists.',
          )}

          <div className="rounded-lg p-4 text-xs leading-relaxed" style={{ background: 'var(--admin-panel-2)', color: 'var(--admin-muted)' }}>
            <strong style={{ color: 'var(--admin-text)' }}>One more step in Paystack:</strong> set
            your webhook to
            <code style={{ color: 'var(--admin-accent)' }}> /api/paystack/webhook</code> on this
            domain. Without it a payment may not mark the order paid automatically.
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="admin-panel space-y-4 p-5">
          <h2 className="text-sm font-semibold">Order emails</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-muted)' }}>
            Sent through Resend. Create an API key at resend.com, verify your sending domain, then
            paste the key here.
          </p>

          <div>
            <label className="admin-label">Resend API key</label>
            <input
              type="password"
              value={secrets.emailApiKey}
              onChange={(e) => setSecrets((s) => ({ ...s, emailApiKey: e.target.value }))}
              placeholder={
                settings.hasEmailApiKey
                  ? 'Saved — type to replace'
                  : settings.emailKeyFromEnv
                    ? 'Set via environment variable'
                    : 're_…'
              }
              className="admin-input mt-1.5"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('From address', 'emailFrom', 'Homeware & Co <orders@yourdomain.com>', 'Must be on a domain verified with Resend.')}
            {field('Reply-to', 'emailReplyTo', 'hello@yourdomain.com')}
          </div>

          <div className="space-y-3">
            {toggle('Email the customer a receipt', 'emailOnOrder')}
            {toggle('Email the shop when an order comes in', 'notifyStore', 'Goes to the store email on the Storefront tab.')}
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--admin-line)' }}>
            <label className="admin-label">Send a test</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
                className="admin-input max-w-xs"
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || !testTo}
                className="admin-btn admin-btn-ghost disabled:opacity-50"
              >
                {testing ? <SpinnerIcon width={14} height={14} /> : 'Send test email'}
              </button>
            </div>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--admin-muted)' }}>
              Save first — the test uses the key that is stored, not what is typed above.
            </p>
          </div>
        </div>
      )}

      <div
        className="sticky bottom-0 mt-5 flex items-center gap-3 border-t py-4 pb-safe"
        style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-bg)' }}
      >
        <button type="button" onClick={save} disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-60">
          {saving ? <SpinnerIcon width={14} height={14} /> : saved ? <><CheckIcon width={14} height={14} /> Saved</> : 'Save settings'}
        </button>
        <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
          Storefront changes appear within a couple of minutes.
        </span>
      </div>
    </>
  );
}
