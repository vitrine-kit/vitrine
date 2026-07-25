import type { MetadataRoute } from 'next';
import { getCatalogSource } from '@/lib/adapter';
import { baseUrl } from '@/lib/site';

/** Dynamic sitemap from the catalog (products + categories + home). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const source = await getCatalogSource();
  const [products, categories] = await Promise.all([
    source.listProducts({ perPage: 500 }),
    source.listCategories(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    ...categories.map((c) => ({
      url: `${baseUrl}/categories/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
  return entries;
}
