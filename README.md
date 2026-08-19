# Homeware & Co

A mobile-first homeware and kitchen storefront — Next.js 15 App Router, TypeScript, Tailwind CSS v4, Prisma + Postgres, Paystack and WhatsApp checkout. Built to deploy on Vercel.

---

## Run it right now

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No database, no API keys, no configuration — the site
serves the bundled catalog in [`src/lib/catalog.ts`](src/lib/catalog.ts) and every page,
filter, cart and WhatsApp checkout works. Wire up Postgres when you are ready.

---

## What is in the box

**Storefront**

| Route | What it does |
| --- | --- |
| `/` | Hero, short list, category tiles, material finder, bestsellers rail, editorial, testimonials, newsletter |
| `/shop` | Full catalog with category / material / sort / search filters (all URL-driven, so filters are shareable) |
| `/product/[slug]` | Gallery, specification / in-the-box / care, quantity stepper, related products, Product JSON-LD |
| `/cart` | Full bag with quantity editing and free-delivery progress |
| `/checkout` | Details → delivery zone → payment, with server-side re-pricing |
| `/order/[reference]` | Confirmation, live Paystack verification, order summary |
| `/about`, `/contact`, `/delivery` | Story, contact form + FAQs, delivery rates and returns |
| `/admin` | Password-gated dashboard: orders, fulfilment status, inline product price/stock editing |

**API**

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/products` | GET | Filtered catalog; `?slugs=a,b` re-prices the cart |
| `/api/products/[slug]` | GET | One product + related |
| `/api/orders` | POST | Create an order (server-priced, stock-checked, returns WhatsApp link) |
| `/api/orders/[reference]` | GET | Order lookup for the confirmation page |
| `/api/newsletter` | POST | Subscribe |
| `/api/contact` | POST | Contact message |
| `/api/paystack/init` | POST | Start a Paystack transaction for an order |
| `/api/paystack/verify` | GET | Verify a payment on redirect back |
| `/api/paystack/webhook` | POST | HMAC-SHA512-verified `charge.success` handler |
| `/api/admin/*` | — | Session-gated orders and product CRUD |

**Design system** — paper + clay palette, Fraunces display over Inter,
defined once as tokens in [`src/app/globals.css`](src/app/globals.css). Every product
without a photo renders generated SVG artwork keyed to its category and accent colour,
so the grid looks finished before your first photoshoot.

---

## Making it yours

### 1. Store identity

Everything — name, phone, WhatsApp number, socials, address — lives in
[`src/lib/config.ts`](src/lib/config.ts), overridable by environment variables.
**Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to your real number** (international format, no `+`,
no spaces — e.g. `2348031234567`) or WhatsApp orders go nowhere.

### 2. Delivery rates

`DELIVERY_ZONES` and `FREE_DELIVERY_THRESHOLD` in the same file. Edit the fees, add or
remove zones — checkout, the delivery page and the order emails all follow.

### 3. Products

Two options:

- **Before you have a database** — edit `src/lib/catalog.ts` directly.
- **After** — use `/admin`, or edit the catalog and re-run `npm run db:seed` (it upserts
  by slug, so it syncs changes without touching orders).

To use real photos, set `imageUrl` on a product to any public image URL (Cloudinary,
Instagram CDN, Google Drive direct link). Leave it `null` and the generated artwork is
used instead.

---

## Adding Postgres (Neon on Vercel)

> **Vercel Postgres no longer exists.** Vercel discontinued its own Postgres product and
> migrated every existing database to [Neon](https://neon.com) in December 2024. Postgres
> on Vercel today means installing a database from the **Vercel Marketplace** — Neon is
> the direct successor and has a free tier. These steps are what "add Vercel Postgres"
> means now.

### On Vercel (recommended — no copying connection strings)

1. Deploy the project once so it exists as a Vercel project (see below).
2. Vercel Dashboard → your project → **Storage** → **Create Database** → **Neon**
   (or Marketplace → Storage → Neon → Install).
3. Pick a region — **AWS `eu-west-2` (London)** or **`eu-central-1` (Frankfurt)** are the
   closest to Nigeria; avoid US regions, every query pays the round trip.
4. Connect it to this project. Vercel injects both variables automatically:

   | Variable | Connection | Used by |
   | --- | --- | --- |
   | `DATABASE_URL` | pooled (host contains `-pooler`) | the app at runtime |
   | `DATABASE_URL_UNPOOLED` | direct | `db:push`, migrations |

5. Pull them down and load the catalog:

```bash
npm i -g vercel
vercel link          # pick this project
npm run vercel:env   # writes .env with the real credentials
npm run db:setup     # push schema + seed 25 products
```

6. **Redeploy** so the running deployment picks up the new variables.

### Locally, or with a Neon account directly

Grab the connection string from the [Neon dashboard](https://console.neon.tech) and put it
in `.env`. If you only see one string, set both variables to it:

```env
DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://…/neondb?sslmode=require"
```

```bash
npm run db:setup     # or: npm run db:push && npm run db:seed
npm run db:studio    # browse the data
```

### What changes once it is connected

The moment `DATABASE_URL` is present, the site reads from Postgres, persists orders,
decrements stock on purchase, and `/admin` comes alive. If the database is ever
unreachable, product pages fall back to the bundled catalog rather than going blank.

### Two gotchas already handled for you

- **PgBouncer + Prisma.** Neon's pooled endpoint runs PgBouncer in transaction mode, where
  Prisma's prepared statements fail with `prepared statement "s0" already exists`. The fix
  is `?pgbouncer=true&connection_limit=1` on the URL — but Vercel overwrites the injected
  variable on every sync, so [`src/lib/prisma.ts`](src/lib/prisma.ts) appends it at runtime
  instead, only when the host is a pooler.
- **Migrations can't run through a pooler.** That is what `directUrl` in
  [`prisma/schema.prisma`](prisma/schema.prisma) is for; it points at
  `DATABASE_URL_UNPOOLED`.

---

## Deploying to Vercel

```bash
npm i -g vercel     # if you do not have it
vercel              # first deploy, links the project
vercel --prod       # production
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new) — it
detects Next.js automatically.

### Environment variables to set in Vercel

Project → Settings → Environment Variables. Copy the names from
[`.env.example`](.env.example):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | for orders/admin | Injected by the Neon integration (pooled) |
| `DATABASE_URL_UNPOOLED` | for db:push | Injected by the Neon integration (direct) |
| `NEXT_PUBLIC_SITE_URL` | yes | Your final domain, e.g. `https://homewareandco.com` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | yes | `2348031234567` |
| `NEXT_PUBLIC_STORE_EMAIL` / `_PHONE` | yes | Shown in the footer and contact page |
| `NEXT_PUBLIC_INSTAGRAM` / `_TIKTOK` | no | Social links |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | for cards | Presence of this enables the card option at checkout |
| `PAYSTACK_SECRET_KEY` | for cards | Server-side only — never prefix with `NEXT_PUBLIC_` |
| `ADMIN_PASSWORD` | for `/admin` | Long and random |
| `ADMIN_SESSION_SECRET` | for `/admin` | 32+ random characters |

`npm run build` already runs `prisma generate`, so no extra build command is needed.

### After deploying

1. **Paystack webhook** — Dashboard → Settings → API Keys & Webhooks → set
   `https://your-domain.com/api/paystack/webhook`.
2. **Custom domain** — Vercel → Settings → Domains. Update `NEXT_PUBLIC_SITE_URL` to match,
   then redeploy so canonical URLs and the sitemap are right.
3. **Test one real order** end to end before you announce the store.

---

## Notes on how it is built

- **Money is never trusted from the browser.** The cart stores slugs and quantities only;
  `/api/orders` looks every price up server-side, checks stock, and computes the total
  itself. A tampered `localStorage` cannot discount anything.
- **Stock is reserved at order time** and returned automatically if you mark an order
  `CANCELLED` in the admin dashboard.
- **The webhook verifies the raw body** with HMAC-SHA512 before trusting it, and always
  returns 200 so Paystack does not enter a retry loop on a transient database error.
- **Admin auth** is one shared password exchanged for a signed, httpOnly 12-hour session
  cookie. Both the password check and the signature check are constant-time. There is no
  user table because a single-operator boutique does not need one.
- **Accessibility** — skip link, labelled controls, visible focus rings, `prefers-reduced-motion`
  respected throughout.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run db:push` | Push the Prisma schema to Postgres |
| `npm run db:seed` | Upsert the catalog into the database |
| `npm run db:studio` | Prisma Studio |
