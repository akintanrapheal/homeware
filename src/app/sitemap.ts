import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/repo';
import { CATEGORIES } from '@/lib/types';
import { STORE } from '@/lib/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();

  return [
    { url: STORE.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${STORE.url}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${STORE.url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${STORE.url}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${STORE.url}/delivery`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...CATEGORIES.map((c) => ({
      url: `${STORE.url}/shop?category=${c.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${STORE.url}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
