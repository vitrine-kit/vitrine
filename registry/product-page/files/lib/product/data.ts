import type { CatalogSource, Product } from '@vitrine-kit/contracts';

export async function loadProduct(source: CatalogSource, slug: string): Promise<Product | null> {
  return source.getProduct(slug);
}

/** Money — минимальные единицы (копейки). */
export function formatPrice(amount: number, currency: string, locale = 'ru-RU'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
