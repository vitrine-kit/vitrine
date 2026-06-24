import type { CatalogSource, Product } from '@vitrine-kit/contracts';

export async function loadProduct(source: CatalogSource, slug: string): Promise<Product | null> {
  return source.getProduct(slug);
}

/** Money — minor units (e.g. cents). */
export function formatPrice(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
