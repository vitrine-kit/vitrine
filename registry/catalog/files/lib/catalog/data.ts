// Catalog access via the CatalogSource contract. The source (Payload*/Vendure*)
// is resolved in the page data (template); a ready CatalogSource arrives here —
// so the feature depends only on the contract and is portable across backends.
import type {
  CatalogSource,
  Category,
  Product,
  ProductQuery,
  ProductSort,
} from '@vitrine-kit/contracts';

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

export function parsePriceBound(value: string | string[] | undefined | null): number | undefined {
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

export async function loadProducts(
  source: CatalogSource,
  query: ProductQuery = {},
): Promise<Product[]> {
  return source.listProducts(query);
}

export async function loadProduct(
  source: CatalogSource,
  slug: string,
  locale?: string,
): Promise<Product | null> {
  return source.getProduct(slug, locale);
}

export async function loadCategories(source: CatalogSource, locale?: string): Promise<Category[]> {
  return source.listCategories(locale);
}

/** Money — minor units (e.g. cents); divide by 100 for 2-decimal currencies. */
export function formatPrice(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
