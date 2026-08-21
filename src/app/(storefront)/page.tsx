import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { ProductArt } from '@/components/product-art';
import { Reveal } from '@/components/reveal';
import { NewsletterForm } from '@/components/newsletter-form';
import {
  ArrowRightIcon,
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/icons';
import { getBestsellers, getCategories, getFeatured, getFeaturedReviews, getProducts } from '@/lib/repo';

import { STORE } from '@/lib/config';
import { buildEnquiryLink } from '@/lib/whatsapp';

export const revalidate = 300;

/** Shopping by material is the useful axis here — it maps to how things behave. */
const MATERIALS = [
  { id: 'cast iron', label: 'Cast iron', note: 'Holds heat for hours', accent: 'from-clay-300/40' },
  { id: 'stainless steel', label: 'Stainless', note: 'Even heat, oven safe', accent: 'from-sage-300/40' },
  { id: 'stoneware', label: 'Stoneware', note: 'Chip-resistant, everyday', accent: 'from-clay-100' },
  { id: 'glass', label: 'Glass', note: 'No stains, no odours', accent: 'from-sage-300/40' },
  { id: 'linen', label: 'Linen', note: 'Softens every wash', accent: 'from-sand-300/40' },
];

const TESTIMONIALS = [
  {
    quote:
      'The 24cm casserole has cooked jollof for twenty people twice a month since December. Nothing catches at the bottom any more, and it still looks new.',
    name: 'Adaeze O.',
    city: 'Abuja',
  },
  {
    quote:
      'Ordered the knife block on a Tuesday evening and it reached my office in Ikeja before noon on Wednesday. Properly boxed, nothing rattling around.',
    name: 'Tolu A.',
    city: 'Lagos',
  },
  {
    quote:
      'I bought the glass canisters for garri and rice before the rains. Three months in, everything is still bone dry. Worth every naira.',
    name: 'Hauwa I.',
    city: 'Kano',
  },
];

const PROMISES = [
  {
    icon: TruckIcon,
    title: 'Nationwide delivery',
    body: 'Same-day across Lagos, one to three days everywhere else in Nigeria.',
  },
  {
    icon: ShieldIcon,
    title: 'Two-year guarantee',
    body: 'If it fails in normal home use we replace it. No hunting for receipts.',
  },
  {
    icon: SparkleIcon,
    title: 'Packed to survive',
    body: 'Double-boxed with corner protection, because glass and courier vans disagree.',
  },
];

export default async function HomePage() {
  const [featured, bestsellers, all, categories, liveReviews] = await Promise.all([
    getFeatured(4),
    getBestsellers(8),
    getProducts(),
    getCategories(),
    getFeaturedReviews(3),
  ]);

  /*
    Real reviews replace the seeded ones entirely rather than mixing with them.
    A strip that blends genuine praise with sample copy is worse than either on
    its own, because nobody can tell which is which.
  */
  const testimonials = liveReviews.length
    ? liveReviews.map((r) => ({ quote: r.body, name: r.author, city: r.city }))
    : TESTIMONIALS;

  const heroProduct = featured[0] ?? all[0];
  // Grouped, not hardcoded, so a category added in the admin lands in the right
  // section without a code change.
  const homeSlugs = new Set(categories.filter((c) => c.group !== 'kitchen').map((c) => c.id));
  const table = all.filter((p) => homeSlugs.has(p.category));

  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className="relative isolate overflow-hidden bg-paper-100">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-clay-100 blur-[120px]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <Reveal>
              <p className="eyebrow mb-5 flex items-center justify-center gap-2 lg:justify-start">
                <SparkleIcon width={14} height={14} />
                Est. Lagos · Delivered nationwide
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="text-balance font-display text-5xl leading-[1.05] text-ink-900 sm:text-6xl lg:text-7xl">
                For the home you
                <br />
                <span className="italic text-clay-600">actually live in.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-600 sm:text-lg lg:mx-0">
                Cookware, knives, tableware and storage chosen the way you would choose them
                yourself: proper materials, honest prices, and built to survive a kitchen that gets
                cooked in every day.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
                <Link href="/shop" className="btn btn-clay">
                  Shop the range
                  <ArrowRightIcon width={16} height={16} />
                </Link>
                <a
                  href={buildEnquiryLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                >
                  <WhatsAppIcon width={16} height={16} />
                  Order on WhatsApp
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-10 flex items-center justify-center gap-5 lg:justify-start">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} width={14} height={14} className="text-clay-500" />
                  ))}
                </div>
                <p className="text-xs text-ink-500">4.8 average · 3,100+ kitchens kitted out</p>
              </div>
            </Reveal>
          </div>

          <div className="order-1 lg:order-2">
            <Reveal delay={120}>
              <div className="relative mx-auto max-w-sm lg:max-w-md">
                <div aria-hidden className="absolute inset-6 rounded-full border border-clay-300/50" />
                <div aria-hidden className="absolute inset-14 rounded-full border border-clay-300/30" />
                {heroProduct && (
                  <div className="relative animate-[drift_9s_ease-in-out_infinite]">
                    <ProductArt
                      category={heroProduct.category}
                      accent={heroProduct.accent}
                      slug={heroProduct.slug}
                      shape={heroProduct.artShape ?? undefined}
                      className="w-full drop-shadow-[0_28px_44px_rgba(80,60,42,0.18)]"
                    />
                  </div>
                )}
                {heroProduct && (
                  <Link
                    href={`/product/${heroProduct.slug}`}
                    className="card absolute bottom-2 left-1/2 flex w-[86%] -translate-x-1/2 items-center justify-between gap-3 px-4 py-3 shadow-sm transition hover:border-clay-300"
                  >
                    <div className="min-w-0">
                      <p className="eyebrow text-[0.58rem]">Kitchen staple</p>
                      <p className="truncate font-display text-lg text-ink-900">
                        {heroProduct.name}
                      </p>
                    </div>
                    <ArrowRightIcon width={18} height={18} className="shrink-0 text-clay-500" />
                  </Link>
                )}
              </div>
            </Reveal>
          </div>
        </div>

        <div className="relative border-t border-paper-300">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-paper-300 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
            {PROMISES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 90} className="flex items-start gap-4 px-2 py-7 sm:px-6">
                <Icon width={22} height={22} className="mt-0.5 shrink-0 text-clay-500" />
                <div>
                  <p className="text-sm font-medium text-ink-900">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- The short list */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-3">The short list</p>
            <h2 className="font-display text-4xl text-ink-900 sm:text-5xl">
              What people keep <span className="italic text-clay-600">reaching for</span>
            </h2>
          </div>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 self-start text-xs uppercase tracking-[0.16em] text-ink-600 transition hover:text-clay-600 sm:self-auto"
          >
            View all
            <ArrowRightIcon
              width={15}
              height={15}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featured.map((product, i) => (
            <Reveal key={product.slug} delay={i * 80}>
              <ProductCard product={product} priority={i < 2} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- Categories */}
      <section className="relative border-y border-paper-300 bg-paper-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Reveal className="mb-12 text-center">
            <p className="eyebrow mb-3">Shop by room</p>
            <h2 className="font-display text-4xl text-ink-900 sm:text-5xl">
              Kitchen and table, <span className="italic text-clay-600">one standard</span>
            </h2>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {categories.map((category, i) => {
              const sample = all.find((p) => p.category === category.id);
              return (
                <Reveal key={category.id} delay={i * 60}>
                  <Link
                    href={`/shop?category=${category.id}`}
                    className="card card-hover group relative flex h-44 items-end overflow-hidden p-5 sm:h-56"
                  >
                    {sample && (
                      <div className="absolute -right-6 -top-4 h-40 w-40 opacity-70 transition-transform duration-700 group-hover:scale-105 sm:h-48 sm:w-48">
                        <ProductArt
                          category={sample.category}
                          accent={sample.accent}
                          slug={sample.slug}
                          shape={sample.artShape ?? undefined}
                          className="h-full w-full"
                        />
                      </div>
                    )}
                    <div className="relative">
                      <p className="eyebrow mb-2 text-[0.58rem]">
                        {category.group === 'kitchen' ? 'Kitchen' : 'For the table'}
                      </p>
                      <h3 className="font-display text-2xl leading-tight text-ink-900">
                        {category.label}
                      </h3>
                      <p className="mt-1.5 max-w-[15rem] text-xs leading-relaxed text-ink-600">
                        {category.blurb}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}

            <Reveal delay={categories.length * 60}>
              <Link
                href="/shop"
                className="group flex h-44 flex-col items-center justify-center gap-3 rounded-[var(--radius-soft)] border border-dashed border-clay-300 p-5 text-center transition hover:border-clay-500 sm:h-56"
              >
                <ArrowRightIcon
                  width={24}
                  height={24}
                  className="text-clay-500 transition-transform group-hover:translate-x-1"
                />
                <span className="font-display text-xl text-ink-900">Everything else</span>
                <span className="text-xs text-ink-600">{all.length} products in stock</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Buy it once */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.25fr] lg:items-center lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Buy it once</p>
            <h2 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl">
              Start with the <span className="italic text-clay-600">material</span>, not the price.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-600 sm:text-base">
              A cheap pan is not cheaper if you replace it every year. Cast iron holds heat for a
              long simmer, tri-ply spreads it evenly for searing, stoneware survives being stacked
              wet in a real sink. Tell us how you actually cook and we will tell you what is worth
              buying — and what is not.
            </p>
            <a
              href={buildEnquiryLink('Hi Homeware & Co! Can you help me choose? I mostly cook…')}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline mt-8"
            >
              <WhatsAppIcon width={16} height={16} />
              Ask what to buy
            </a>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MATERIALS.map((material) => (
                <Link
                  key={material.id}
                  href={`/shop?family=${encodeURIComponent(material.id)}`}
                  className={`card card-hover flex flex-col justify-between bg-gradient-to-br ${material.accent} to-transparent p-4 sm:p-5`}
                >
                  <h3 className="font-display text-xl text-ink-900">{material.label}</h3>
                  <p className="mt-6 text-[0.7rem] leading-relaxed text-ink-600">{material.note}</p>
                </Link>
              ))}
              <Link href="/shop" className="card card-hover flex flex-col justify-between p-4 sm:p-5">
                <h3 className="font-display text-xl text-clay-600">Not sure?</h3>
                <p className="mt-6 text-[0.7rem] leading-relaxed text-ink-600">
                  Ask us — we answer fast
                </p>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------- Bestsellers */}
      <section className="border-y border-paper-300 bg-paper-100 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Loved by thousands</p>
              <h2 className="font-display text-4xl text-ink-900 sm:text-5xl">Bestsellers</h2>
            </div>
            <Link
              href="/shop?sort=rating"
              className="group inline-flex shrink-0 items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-600 transition hover:text-clay-600"
            >
              <span className="hidden sm:inline">Top rated</span>
              <ArrowRightIcon
                width={15}
                height={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Reveal>
        </div>

        <div className="rail px-4 sm:px-6 lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-8">
          {bestsellers.map((product, i) => (
            <div key={product.slug} className="w-[62vw] max-w-[17rem] lg:w-auto lg:max-w-none">
              <Reveal delay={i * 60}>
                <ProductCard product={product} />
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ The table */}
      <section className="relative overflow-hidden bg-paper-50">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-2 gap-3">
              {table.slice(0, 4).map((p, i) => (
                <Link
                  key={p.slug}
                  href={`/product/${p.slug}`}
                  className={`card card-hover aspect-square overflow-hidden ${i % 3 === 0 ? 'mt-0' : 'mt-6'}`}
                >
                  <ProductArt
                    category={p.category}
                    accent={p.accent}
                    slug={p.slug}
                    shape={p.artShape ?? undefined}
                    className="h-full w-full"
                  />
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <p className="eyebrow mb-3">The table</p>
            <h2 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl">
              Pieces that <span className="italic text-clay-600">earn their shelf</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-ink-600 sm:text-base">
              Stoneware that goes from oven to table without a second dish. Glasses with enough
              weight to feel like something. Linen that gets better every wash. We only stock what
              we use at home, which is why the range is short and stays that way.
            </p>

            <dl className="mt-9 grid grid-cols-3 gap-6">
              {[
                { k: '48hrs', v: 'Average delivery' },
                { k: '3,100+', v: 'Orders shipped' },
                { k: '4.8★', v: 'Customer rating' },
              ].map((stat) => (
                <div key={stat.k}>
                  <dt className="font-display text-3xl text-clay-600">{stat.k}</dt>
                  <dd className="mt-1 text-[0.7rem] uppercase tracking-[0.12em] text-ink-500">
                    {stat.v}
                  </dd>
                </div>
              ))}
            </dl>

            <Link href="/shop?category=tableware" className="btn btn-outline mt-9">
              Browse the table
              <ArrowRightIcon width={16} height={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------- Testimonials */}
      <section className="border-t border-paper-300 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <p className="eyebrow mb-3">In their words</p>
            <h2 className="font-display text-4xl text-ink-900 sm:text-5xl">
              Used daily, <span className="italic text-clay-600">and still going</span>
            </h2>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <figure className="card flex h-full flex-col p-6 sm:p-7">
                  <div className="mb-4 flex gap-1">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <StarIcon key={s} width={13} height={13} className="text-clay-500" />
                    ))}
                  </div>
                  <blockquote className="flex-1 font-display text-lg italic leading-relaxed text-ink-800">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 border-t border-paper-200 pt-4 text-xs text-ink-500">
                    <span className="text-ink-900">{t.name}</span> · {t.city}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Newsletter */}
      <section className="relative overflow-hidden border-t border-paper-300 bg-paper-100">
        <Reveal className="relative mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="eyebrow mb-4">The Homeware &amp; Co list</p>
          <h2 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl">
            New arrivals, <span className="italic text-clay-600">better prices</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-600">
            Restock alerts, new arrivals and subscriber-only pricing. One email a month — we hate
            clutter as much as you do.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
          <p className="mt-6 text-xs text-ink-500">
            Prefer to talk? Message {STORE.phone} on WhatsApp.
          </p>
        </Reveal>
      </section>
    </>
  );
}
