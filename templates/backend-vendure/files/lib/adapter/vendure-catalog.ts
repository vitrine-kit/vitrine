// Реализация контракта CatalogSource поверх Vendure Shop API. Нормализация — в
// чистых мапперах (map.ts). Тот же контракт, что у Payload-адаптера → фичи каталога
// переносимы без изменений.
import type { CatalogSource, Category, Product, ProductQuery } from '@vitrine-kit/contracts';
import { shopQuery } from './graphql.js';
import { mapVendureCollection, mapVendureProduct } from './map.js';
import type { VCollection, VProduct } from './vendure-types.js';

const PRODUCT_FIELDS = `
  id name slug description
  featuredAsset { preview width height }
  assets { preview }
  collections { id slug name }
  variants { id sku name priceWithTax currencyCode stockLevel }
`;

export class VendureCatalogSource implements CatalogSource {
  async listProducts(query: ProductQuery = {}): Promise<Product[]> {
    const take = query.perPage ?? 24;
    const skip = ((query.page ?? 1) - 1) * take;

    if (query.category) {
      const { data } = await shopQuery<{ collection: { productVariants: { items: { product: VProduct }[] } } | null }>(
        `query ($slug: String!) { collection(slug: $slug) { productVariants { items { product { ${PRODUCT_FIELDS} } } } } }`,
        { slug: query.category },
      );
      const byId = new Map<string, VProduct>();
      for (const it of data.collection?.productVariants.items ?? []) byId.set(String(it.product.id), it.product);
      return [...byId.values()].map(mapVendureProduct);
    }

    const { data } = await shopQuery<{ products: { items: VProduct[] } }>(
      `query ($take: Int, $skip: Int) { products(options: { take: $take, skip: $skip }) { items { ${PRODUCT_FIELDS} } } }`,
      { take, skip },
    );
    return data.products.items.map(mapVendureProduct);
  }

  async getProduct(slug: string): Promise<Product | null> {
    const { data } = await shopQuery<{ product: VProduct | null }>(
      `query ($slug: String!) { product(slug: $slug) { ${PRODUCT_FIELDS} } }`,
      { slug },
    );
    return data.product ? mapVendureProduct(data.product) : null;
  }

  async listCategories(): Promise<Category[]> {
    const { data } = await shopQuery<{ collections: { items: VCollection[] } }>(
      `{ collections { items { id slug name description parent { id } } } }`,
    );
    return data.collections.items.map(mapVendureCollection);
  }

  async search(term: string): Promise<Product[]> {
    const { data } = await shopQuery<{ search: { items: { slug: string }[] } }>(
      `query ($term: String!) { search(input: { term: $term, groupByProduct: true }) { items { slug } } }`,
      { term },
    );
    const products = await Promise.all(data.search.items.map((i) => this.getProduct(i.slug)));
    return products.filter((p): p is Product => p !== null);
  }
}
