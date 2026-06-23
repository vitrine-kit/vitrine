// Доступ к каталогу через контракт CatalogSource. Источник (Payload*/Vendure*)
// резолвится в данных страницы (template), сюда приходит готовый CatalogSource —
// так фича зависит только от контракта и переносима между бэкендами.
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

/** Money — минимальные единицы (копейки); делим на 100 для 2-знаковых валют. */
export function formatPrice(amount: number, currency: string, locale = 'ru-RU'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
