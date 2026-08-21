import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductImage } from '@/components/product-art';
import { ProductCard } from '@/components/product-card';
import { AddToCartWithQuantity } from '@/components/add-to-cart';
import { Reveal } from '@/components/reveal';
import {
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/icons';
import { getProductBySlug, getProductReviews, getProducts, getRatingFor, getRelatedProducts } from '@/lib/repo';
import { ProductReviews } from '@/components/product-reviews';
import { discountPercent, formatNaira } from '@/lib/format';
import { CATEGORY_LABEL } from '@/lib/types';
import { STORE } from '@/lib/config';
import { buildEnquiryLink } from '@/lib/whatsapp';

export const revalidate = 120;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product not found' };

  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.name} · ${STORE.name}`,
      description: product.description.slice(0, 200),
      ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, reviews, ratingInfo] = await Promise.all([
    getRelatedProducts(product, 4),
    getProductReviews(product.id, 20),
    // Real reviews win; the seeded figure stands in only until there are some.
    getRatingFor(product.id, { rating: product.rating, reviewCount: product.reviewCount }),
  ]);
  const off = discountPercent(product.price, product.compareAt);
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 6;

  const detailSections = [
    { label: 'Specification', items: product.specs },
    { label: 'In the box', items: product.inBox },
    { label: 'Care', items: product.care },
  ].filter((row) => row.items.length > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: { '@type': 'Brand', name: product.brand },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ratingInfo.rating,
      reviewCount: Math.max(1, ratingInfo.reviewCount),
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'NGN',
      availability: soldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: `${STORE.url}/product/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-7 text-[0.68rem] uppercase tracking-[0.18em] text-ink-500"
        >
          <Link href="/" className="transition hover:text-clay-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="transition hover:text-clay-600">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/shop?category=${product.category}`}
            className="transition hover:text-clay-600"
          >
            {CATEGORY_LABEL[product.category]}
          </Link>
        </nav>

        <div className="grid gap-9 lg:grid-cols-2 lg:gap-16">
          {/* Artwork */}
          <Reveal>
            <div className="card relative aspect-square overflow-hidden lg:sticky lg:top-28">
              <ProductImage
                imageUrl={product.imageUrl}
                name={product.name}
                category={product.category}
                accent={product.accent}
            slug={product.slug}
            shape={product.artShape ?? undefined}
                priority
              />
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {off !== null && (
                  <span className="rounded-full bg-clay-600 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-paper-50">
                    Save {off}%
                  </span>
                )}
                {product.bestseller && (
                  <span className="rounded-full border border-clay-300 bg-paper-100 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-clay-600 backdrop-blur-sm">
                    Bestseller
                  </span>
                )}
              </div>
            </div>
          </Reveal>

          {/* Detail */}
          <Reveal delay={100}>
            <div>
              <p className="eyebrow mb-3">
                {CATEGORY_LABEL[product.category]} · <span className="capitalize">{product.family}</span>
              </p>

              <h1 className="font-display text-4xl font-light leading-tight text-ink-900 sm:text-5xl">
                {product.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600">
                <span className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon
                      key={i}
                      width={13}
                      height={13}
                      className={i < Math.round(product.rating) ? 'text-clay-500' : 'text-ink-800/20'}
                    />
                  ))}
                  <span className="ml-1 tabular-nums text-ink-700">
                    {ratingInfo.rating.toFixed(1)}
                  </span>
                </span>
                <span>{ratingInfo.reviewCount} reviews</span>
                {product.sizeLabel && <span>{product.sizeLabel}</span>}
              </div>

              <div className="mt-7 flex items-end gap-4">
                <p className="font-display text-4xl font-light text-clay-600">
                  {formatNaira(product.price)}
                </p>
                {product.compareAt && (
                  <p className="pb-1.5 text-lg text-ink-500 line-through">
                    {formatNaira(product.compareAt)}
                  </p>
                )}
              </div>

              <p className="mt-2 text-xs text-ink-500">
                {soldOut ? (
                  <span className="text-rose-accent">Currently sold out — message us to be notified</span>
                ) : lowStock ? (
                  <span className="text-clay-600">Only {product.stock} left in stock</span>
                ) : (
                  'In stock · ships within 24 hours'
                )}
              </p>

              <p className="mt-7 text-sm leading-relaxed text-ink-700 sm:text-base">
                {product.description}
              </p>

              <div className="mt-9">
                <AddToCartWithQuantity slug={product.slug} stock={product.stock} />
              </div>

              <a
                href={buildEnquiryLink(
                  `Hi ${STORE.name}! I am interested in ${product.name} (${formatNaira(product.price)}). Is it available?`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline mt-3 w-full"
              >
                <WhatsAppIcon width={16} height={16} />
                Ask about this on WhatsApp
              </a>

              {detailSections.length > 0 && (
                <div className="mt-11 space-y-8">
                  {detailSections.map((section) => (
                    <div key={section.label}>
                      <h2 className="eyebrow mb-4">{section.label}</h2>
                      <ul className="space-y-2.5">
                        {section.items.map((item) => (
                          <li
                            key={item}
                            className="flex gap-3 border-b border-paper-200 pb-2.5 text-sm leading-relaxed text-ink-700"
                          >
                            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-clay-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <ul className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: TruckIcon, text: 'Same-day Lagos delivery, 1–3 days nationwide' },
                  { icon: ShieldIcon, text: '100% authentic or your money back' },
                  { icon: SparkleIcon, text: 'Gift-wrapped with a note card, free' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-xs leading-relaxed text-ink-600">
                    <Icon width={18} height={18} className="mt-0.5 shrink-0 text-clay-500" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <ProductReviews
          productSlug={product.slug}
          productName={product.name}
          reviews={reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />

        {related.length > 0 && (
          <section className="mt-20 sm:mt-28">
            <Reveal className="mb-8">
              <p className="eyebrow mb-3">You may also like</p>
              <h2 className="font-display text-3xl font-light text-ink-900 sm:text-4xl">
                Pairs beautifully with
              </h2>
            </Reveal>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((item, i) => (
                <Reveal key={item.slug} delay={i * 70}>
                  <ProductCard product={item} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
