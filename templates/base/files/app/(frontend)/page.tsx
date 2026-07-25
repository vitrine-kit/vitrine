// Storefront home: catalog listing. Data via the CatalogSource contract
// (backend-agnostic); the grid is the catalog feature's component.
import type { Metadata } from 'next';
import { Slot } from '@vitrine-kit/core/react';
import { getCatalogSource } from '@/lib/adapter';
import {
  collectOptionFacets,
  loadProducts,
  parsePriceBound,
  parseProductFilters,
  parseProductSort,
} from '@/lib/catalog/data';
import { getRequestLocale } from '@/lib/i18n/locale';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { siteName } from '@/lib/site';

function DemoHero() {
  return (
    <section
      aria-labelledby="demo-hero-heading"
      className="flex flex-col gap-gutter border-b border-border pb-section"
    >
      <p className="text-sm uppercase tracking-wide text-muted-fg">Demo catalog</p>
      <h1 id="demo-hero-heading" className="font-heading text-3xl text-fg md:text-4xl">
        {siteName}
      </h1>
      <p className="max-w-prose text-muted-fg">
        Zero-config seed data is loaded for local development — five products across Apparel and
        Accessories. Browse a category, open a product with size or color options, add it to the
        cart, then continue to checkout when a payment provider is configured.
      </p>
      <div className="flex flex-wrap gap-gutter">
        <a
          href="/categories/apparel"
          className="rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Shop apparel
        </a>
        <a
          href="/products/classic-tee"
          className="rounded-md border border-border px-gutter py-unit text-fg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Try Classic T-Shirt
        </a>
      </div>
    </section>
  );
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: siteName },
    description: `${siteName} — product catalog.`,
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = parseProductSort(typeof params.sort === 'string' ? params.sort : undefined) ?? 'newest';
  const filters = parseProductFilters(params);
  const priceMin = parsePriceBound(params.priceMin);
  const priceMax = parsePriceBound(params.priceMax);
  const locale = await getRequestLocale();
  const source = await getCatalogSource();

  const facetSource = await loadProducts(source, { perPage: 100, locale });
  const facets = collectOptionFacets(facetSource);
  const products = await loadProducts(source, {
    perPage: 12,
    sort,
    filters,
    priceMin,
    priceMax,
    locale,
  });

  return (
    <div className="flex flex-col gap-section">
      <Slot name="home.hero" fallback={<DemoHero />} />
      <section aria-labelledby="catalog-heading" className="flex flex-col gap-gutter">
        <h2 id="catalog-heading" className="font-heading text-fg">
          Catalog
        </h2>
        <Slot
          name="catalog.toolbar"
          sort={sort}
          action="/"
          facets={facets}
          filters={filters ?? {}}
          priceMin={typeof params.priceMin === 'string' ? params.priceMin : ''}
          priceMax={typeof params.priceMax === 'string' ? params.priceMax : ''}
        />
        <Slot name="catalog.grid-top" />
        <ProductGrid products={products} />
        <Slot name="catalog.grid-bottom" />
      </section>
      <Slot name="home.sections" />
      <Slot name="home.bottom" />
    </div>
  );
}
