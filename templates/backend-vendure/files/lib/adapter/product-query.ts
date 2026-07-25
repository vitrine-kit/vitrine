// Pure ProductQuery helpers — filter/sort in memory after the adapter loads products.
// Price lives on variants, so Payload cannot ORDER BY price in SQL without a denormalized
// field; this keeps the contract honest for catalog-sized datasets.
import type { Product, ProductQuery, ProductSort } from '@vitrine-kit/contracts';

export function parseProductSort(value: string | undefined | null): ProductSort | undefined {
  if (value === 'newest' || value === 'price-asc' || value === 'price-desc' || value === 'relevance') {
    return value;
  }
  return undefined;
}

/** Parse `?size=S&size=L&color=Black` style params into ProductQuery.filters. */
export function parseProductFilters(
  params: Record<string, string | string[] | undefined>,
  facetKeys: string[] = ['size', 'color'],
): Record<string, string[]> | undefined {
  const filters: Record<string, string[]> = {};
  for (const key of facetKeys) {
    const raw = params[key];
    if (raw == null) continue;
    const values = (Array.isArray(raw) ? raw : [raw])
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) filters[key] = [...new Set(values)];
  }
  return Object.keys(filters).length ? filters : undefined;
}

export function parsePriceBound(
  value: string | string[] | undefined | null,
): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  // URL values are major currency units ($); ProductQuery uses minor units.
  return Math.round(n * 100);
}

/** Aggregate option values present on the given products (for toolbar facets). */
export function collectOptionFacets(products: Product[]): Record<string, string[]> {
  const buckets = new Map<string, Set<string>>();
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.options) continue;
      for (const [key, val] of Object.entries(v.options)) {
        if (!val) continue;
        let set = buckets.get(key);
        if (!set) {
          set = new Set();
          buckets.set(key, set);
        }
        set.add(val);
      }
    }
  }
  const out: Record<string, string[]> = {};
  for (const [key, set] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out[key] = [...set].sort((a, b) => a.localeCompare(b));
  }
  return out;
}

function matchesFilters(product: Product, filters: Record<string, string[]>): boolean {
  for (const [key, wanted] of Object.entries(filters)) {
    if (!wanted.length) continue;
    const has = product.variants.some((v) => {
      const actual = v.options?.[key];
      return actual != null && wanted.includes(actual);
    });
    if (!has) return false;
  }
  return true;
}

function matchesSearch(product: Product, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const hay = `${product.title} ${product.description ?? ''} ${product.slug}`.toLowerCase();
  return hay.includes(q);
}

function priceOf(product: Product): number {
  return product.priceRange?.min ?? product.variants[0]?.price ?? Number.POSITIVE_INFINITY;
}

function matchesPrice(product: Product, priceMin?: number, priceMax?: number): boolean {
  if (priceMin == null && priceMax == null) return true;
  // A product matches if any variant price falls in range (merchandising expectation).
  return product.variants.some((v) => {
    if (priceMin != null && v.price < priceMin) return false;
    if (priceMax != null && v.price > priceMax) return false;
    return true;
  });
}

/** Apply search / filters / sort that the DB layer cannot express cheaply. */
export function applyProductQuery(products: Product[], query: ProductQuery = {}): Product[] {
  let out = products;
  if (query.search?.trim()) {
    out = out.filter((p) => matchesSearch(p, query.search!));
  }
  if (query.filters && Object.keys(query.filters).length > 0) {
    out = out.filter((p) => matchesFilters(p, query.filters!));
  }
  if (query.priceMin != null || query.priceMax != null) {
    out = out.filter((p) => matchesPrice(p, query.priceMin, query.priceMax));
  }
  const sort = query.sort ?? 'newest';
  if (sort === 'price-asc') {
    out = [...out].sort((a, b) => priceOf(a) - priceOf(b));
  } else if (sort === 'price-desc') {
    out = [...out].sort((a, b) => priceOf(b) - priceOf(a));
  } else if (sort === 'relevance' && query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    out = [...out].sort((a, b) => {
      const aTitle = a.title.toLowerCase().startsWith(q) ? 0 : a.title.toLowerCase().includes(q) ? 1 : 2;
      const bTitle = b.title.toLowerCase().startsWith(q) ? 0 : b.title.toLowerCase().includes(q) ? 1 : 2;
      return aTitle - bTitle || a.title.localeCompare(b.title);
    });
  }
  // newest: keep adapter order (typically -createdAt)
  return out;
}
