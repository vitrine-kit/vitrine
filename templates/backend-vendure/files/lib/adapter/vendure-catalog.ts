// CatalogSource contract implementation on top of the Vendure Shop API. Normalization
// lives in the pure mappers (map.ts). The same contract as the Payload adapter → the
// catalog features are portable without changes.
import type { CatalogSource, Category, Product, ProductQuery } from '@vitrine-kit/contracts';
import { shopQuery } from './graphql.js';
import { mapVendureCollection, mapVendureProduct } from './map.js';
import { applyProductQuery } from './product-query.js';
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

    let products: Product[];
    if (query.search?.trim()) {
      products = await this.search(query.search.trim(), query.locale);
    } else if (query.category) {
      const { data } = await shopQuery<{ collection: { productVariants: { items: { product: VProduct }[] } } | null }>(
        `query ($slug: String!) { collection(slug: $slug) { productVariants { items { product { ${PRODUCT_FIELDS} } } } } }`,
        { slug: query.category },
      );
      const byId = new Map<string, VProduct>();
      for (const it of data.collection?.productVariants.items ?? []) byId.set(String(it.product.id), it.product);
      products = [...byId.values()].map(mapVendureProduct);
    } else {
      const { data } = await shopQuery<{ products: { items: VProduct[] } }>(
        `query ($take: Int, $skip: Int) { products(options: { take: $take, skip: $skip }) { items { ${PRODUCT_FIELDS} } } }`,
        { take: Math.max(take, 100), skip: 0 },
      );
      products = data.products.items.map(mapVendureProduct);
    }

    products = applyProductQuery(products, query);
    return products.slice(skip, skip + take);
  }

  async getProduct(slug: string, _locale?: string): Promise<Product | null> {
    const { data } = await shopQuery<{ product: VProduct | null }>(
      `query ($slug: String!) { product(slug: $slug) { ${PRODUCT_FIELDS} } }`,
      { slug },
    );
    return data.product ? mapVendureProduct(data.product) : null;
  }

  async listCategories(_locale?: string): Promise<Category[]> {
    const { data } = await shopQuery<{ collections: { items: VCollection[] } }>(
      `{ collections { items { id slug name description parent { id } } } }`,
    );
    return data.collections.items.map(mapVendureCollection);
  }

  async search(term: string, locale?: string): Promise<Product[]> {
    const { data } = await shopQuery<{ search: { items: { slug: string }[] } }>(
      `query ($term: String!) { search(input: { term: $term, groupByProduct: true }) { items { slug } } }`,
      { term },
    );
    const products = await Promise.all(data.search.items.map((i) => this.getProduct(i.slug, locale)));
    return products.filter((p): p is Product => p !== null);
  }
}
