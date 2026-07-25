// Search via CatalogSource.search — portable across Payload and Vendure adapters.
import type { CatalogSource, Product } from '@vitrine-kit/contracts';

export async function loadSearch(source: CatalogSource, term: string): Promise<Product[]> {
  const q = term.trim();
  if (!q) return [];
  return source.search(q);
}
