// Category listing. Filtered by category slug via the CatalogSource contract.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Slot } from '@vitrine-kit/core/react';
import { getCatalogSource } from '@/lib/adapter';
import {
  collectOptionFacets,
  loadCategories,
  loadProducts,
  parsePriceBound,
  parseProductFilters,
  parseProductSort,
} from '@/lib/catalog/data';
import { getRequestLocale } from '@/lib/i18n/locale';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { siteName } from '@/lib/site';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const source = await getCatalogSource();
  const category = (await loadCategories(source, locale)).find((c) => c.slug === slug);
  if (!category) return {};
  return {
    title: category.title,
    description: category.description ?? `${category.title} — ${siteName}`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseProductSort(typeof sp.sort === 'string' ? sp.sort : undefined) ?? 'newest';
  const filters = parseProductFilters(sp);
  const priceMin = parsePriceBound(sp.priceMin);
  const priceMax = parsePriceBound(sp.priceMax);
  const locale = await getRequestLocale();
  const source = await getCatalogSource();
  const category = (await loadCategories(source, locale)).find((c) => c.slug === slug);
  if (!category) notFound();

  const facetSource = await loadProducts(source, { category: slug, perPage: 100, locale });
  const facets = collectOptionFacets(facetSource);
  const products = await loadProducts(source, {
    category: slug,
    sort,
    filters,
    priceMin,
    priceMax,
    locale,
  });

  return (
    <div className="flex flex-col gap-section">
      <Slot name="category.header" category={category} />
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">{category.title}</h1>
        {category.description ? (
          <p className="max-w-prose text-muted-fg">{category.description}</p>
        ) : null}
      </header>
      <Slot
        name="catalog.toolbar"
        sort={sort}
        action={`/categories/${slug}`}
        facets={facets}
        filters={filters ?? {}}
        priceMin={typeof sp.priceMin === 'string' ? sp.priceMin : ''}
        priceMax={typeof sp.priceMax === 'string' ? sp.priceMax : ''}
      />
      <ProductGrid products={products} />
      <Slot name="category.below-products" />
    </div>
  );
}
