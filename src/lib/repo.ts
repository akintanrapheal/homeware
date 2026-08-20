import { CATALOG } from './catalog';
import { hasDatabase, prisma } from './prisma';
import type { Accent, CategoryId, CategoryMeta, Product } from './types';
import { CATEGORIES } from './types';

/**
 * Single read/write surface for product data. Server components and API routes
 * import from here and never touch Prisma directly, which is what lets the site
 * fall back to the bundled catalog when DATABASE_URL is absent.
 */

export interface ProductQuery {
  category?: CategoryId | 'all';
  search?: string;
  family?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  family: string;
  description: string;
  specs: string[];
  care: string[];
  inBox: string[];
  sizeLabel: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  imageUrl: string | null;
  accent: string;
  featured: boolean;
  bestseller: boolean;
  rating: number;
  reviewCount: number;
};

function toProduct(row: DbProduct): Product {
  return {
    ...row,
    category: row.category as CategoryId,
    accent: row.accent as Accent,
  };
}

function sortProducts(list: Product[], sort: ProductQuery['sort']): Product[] {
  const out = [...list];
  switch (sort) {
    case 'price-asc':
      return out.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return out.sort((a, b) => b.price - a.price);
    case 'rating':
      return out.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'newest':
      return out;
    default:
      return out.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          Number(b.bestseller) - Number(a.bestseller) ||
          b.rating - a.rating,
      );
  }
}

function filterCatalog(query: ProductQuery): Product[] {
  const term = query.search?.trim().toLowerCase();
  let list = CATALOG.filter((p) => {
    if (query.category && query.category !== 'all' && p.category !== query.category) {
      return false;
    }
    if (query.family && query.family !== 'all' && p.family !== query.family) return false;
    if (typeof query.minPrice === 'number' && p.price < query.minPrice) return false;
    if (typeof query.maxPrice === 'number' && p.price > query.maxPrice) return false;
    if (term) {
      const haystack = [p.name, p.brand, p.description, p.family, ...p.specs]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
  list = sortProducts(list, query.sort);
  return query.limit ? list.slice(0, query.limit) : list;
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  if (!hasDatabase || !prisma) return filterCatalog(query);

  try {
    const rows = await prisma.product.findMany({
      where: {
        ...(query.category && query.category !== 'all' ? { category: query.category } : {}),
        ...(query.family && query.family !== 'all' ? { family: query.family } : {}),
        ...(typeof query.minPrice === 'number' || typeof query.maxPrice === 'number'
          ? {
              price: {
                ...(typeof query.minPrice === 'number' ? { gte: query.minPrice } : {}),
                ...(typeof query.maxPrice === 'number' ? { lte: query.maxPrice } : {}),
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' as const } },
                { description: { contains: query.search, mode: 'insensitive' as const } },
                { family: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy:
        query.sort === 'price-asc'
          ? { price: 'asc' }
          : query.sort === 'price-desc'
            ? { price: 'desc' }
            : query.sort === 'rating'
              ? { rating: 'desc' }
              : query.sort === 'newest'
                ? { createdAt: 'desc' }
                : [{ featured: 'desc' }, { bestseller: 'desc' }, { rating: 'desc' }],
      ...(query.limit ? { take: query.limit } : {}),
    });
    return rows.map(toProduct);
  } catch (error) {
    // A cold or unreachable database must never blank the storefront.
    console.error('[repo] product query failed, serving bundled catalog', error);
    return filterCatalog(query);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasDatabase || !prisma) {
    return CATALOG.find((p) => p.slug === slug) ?? null;
  }
  try {
    const row = await prisma.product.findUnique({ where: { slug } });
    return row ? toProduct(row) : null;
  } catch (error) {
    console.error('[repo] product lookup failed, serving bundled catalog', error);
    return CATALOG.find((p) => p.slug === slug) ?? null;
  }
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  if (!hasDatabase || !prisma) {
    return CATALOG.filter((p) => slugs.includes(p.slug));
  }
  try {
    const rows = await prisma.product.findMany({ where: { slug: { in: slugs } } });
    return rows.map(toProduct);
  } catch (error) {
    console.error('[repo] batch lookup failed, serving bundled catalog', error);
    return CATALOG.filter((p) => slugs.includes(p.slug));
  }
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const sameCategory = await getProducts({ category: product.category, limit: limit + 4 });
  const pool = sameCategory.filter((p) => p.slug !== product.slug);
  if (pool.length >= limit) return pool.slice(0, limit);

  const filler = (await getProducts({ limit: limit + 6 })).filter(
    (p) => p.slug !== product.slug && !pool.some((q) => q.slug === p.slug),
  );
  return [...pool, ...filler].slice(0, limit);
}

export async function getFeatured(limit = 4): Promise<Product[]> {
  const all = await getProducts({ sort: 'featured' });
  const featured = all.filter((p) => p.featured);
  return (featured.length >= limit ? featured : all).slice(0, limit);
}

export async function getBestsellers(limit = 8): Promise<Product[]> {
  const all = await getProducts({ sort: 'featured' });
  const best = all.filter((p) => p.bestseller);
  return (best.length >= limit ? best : all).slice(0, limit);
}

/**
 * Categories, from the database when there is one. Falls back to the bundled
 * list so the nav, footer and shop filters never render empty — a storefront
 * with no categories looks broken in a way a missing product does not.
 */
export async function getCategories(includeInactive = false): Promise<CategoryMeta[]> {
  if (!hasDatabase || !prisma) return CATEGORIES;

  try {
    const rows = await prisma.category.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    if (rows.length === 0) return CATEGORIES;

    return rows.map((r) => ({
      id: r.slug,
      label: r.label,
      blurb: r.blurb,
      group: r.group,
      shape: r.shape,
    }));
  } catch (error) {
    console.error('[repo] category query failed, serving bundled list', error);
    return CATEGORIES;
  }
}

/** Slug → generated-artwork shape, for products with no photograph. */
export async function getCategoryShapes(): Promise<Record<string, string>> {
  const cats = await getCategories(true);
  return cats.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.shape ?? c.id;
    return acc;
  }, {});
}
