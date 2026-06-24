// Catalog access via the CatalogSource contract. The source (Payload*/Vendure*)
// is resolved in the page data (template); a ready CatalogSource arrives here —
// so the feature depends only on the contract and is portable across backends.
import type { CatalogSource, Category, Product, ProductQuery } from '@vitrine-kit/contracts';

export async function loadProducts(
  source: CatalogSource,
  query: ProductQuery = {},
): Promise<Product[]> {
  return source.listProducts(query);
}

export async function loadProduct(source: CatalogSource, slug: string): Promise<Product | null> {
  return source.getProduct(slug);
}

export async function loadCategories(source: CatalogSource): Promise<Category[]> {
  return source.listCategories();
}

/** Money — minor units (e.g. cents); divide by 100 for 2-decimal currencies. */
export function formatPrice(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
