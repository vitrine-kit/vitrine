// CatalogSource contract implementation on top of the Payload local API.
// All domain normalization lives in the pure mappers (map.ts). Here — only queries.
import type { Payload } from 'payload';
import type {
  CatalogSource,
  Category,
  Product,
  ProductQuery,
  ProductSort,
} from '@vitrine-kit/contracts';
import { mapCategory, mapProduct } from './map.js';
import { applyProductQuery } from './product-query.js';
import type { ProductDoc, VariantDoc } from './payload-types.js';

function sortExpr(sort?: ProductSort): string {
  // Price sorts are applied in memory after variants load (see applyProductQuery).
  switch (sort) {
    case 'price-asc':
    case 'price-desc':
    case 'relevance':
      return '-createdAt';
    default:
      return '-createdAt';
  }
}

function localeOpt(locale?: string): { locale?: string } {
  return locale ? { locale } : {};
}

export class PayloadCatalogSource implements CatalogSource {
  constructor(
    private readonly payload: Payload,
    private readonly currency: string,
  ) {}

  private async withVariants(doc: ProductDoc): Promise<Product> {
    const variants = await this.payload.find({
      collection: 'variants',
      where: { product: { equals: doc.id } },
      depth: 0,
      limit: 200,
    });
    return mapProduct(doc, variants.docs as unknown as VariantDoc[], this.currency);
  }

  async listProducts(query: ProductQuery = {}): Promise<Product[]> {
    const where: Record<string, unknown> = {};
    if (query.category) {
      where['categories.slug'] = { equals: query.category };
    }
    // Prefer DB-side title match when searching; applyProductQuery also matches description.
    if (query.search?.trim() && !query.filters && query.priceMin == null && query.priceMax == null) {
      where.title = { like: query.search.trim() };
    }

    // When filtering by variant options/price or sorting by price, pull a wider page then refine.
    const needsMemoryPass =
      Boolean(query.filters && Object.keys(query.filters).length > 0) ||
      query.priceMin != null ||
      query.priceMax != null ||
      query.sort === 'price-asc' ||
      query.sort === 'price-desc' ||
      query.sort === 'relevance';

    const limit = needsMemoryPass ? Math.max(query.perPage ?? 24, 100) : (query.perPage ?? 24);
    const res = await this.payload.find({
      collection: 'products',
      where,
      depth: 1,
      limit,
      page: needsMemoryPass ? 1 : (query.page ?? 1),
      sort: sortExpr(query.sort),
      ...localeOpt(query.locale),
    });
    let products = await Promise.all(res.docs.map((d) => this.withVariants(d as unknown as ProductDoc)));
    products = applyProductQuery(products, query);

    if (needsMemoryPass) {
      const page = query.page ?? 1;
      const perPage = query.perPage ?? 24;
      const start = (page - 1) * perPage;
      return products.slice(start, start + perPage);
    }
    return products;
  }

  async getProduct(slug: string, locale?: string): Promise<Product | null> {
    const res = await this.payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      depth: 1,
      limit: 1,
      ...localeOpt(locale),
    });
    const doc = res.docs[0];
    return doc ? this.withVariants(doc as unknown as ProductDoc) : null;
  }

  async listCategories(locale?: string): Promise<Category[]> {
    const res = await this.payload.find({
      collection: 'categories',
      depth: 0,
      limit: 200,
      ...localeOpt(locale),
    });
    return res.docs.map((d) => mapCategory(d as unknown as never));
  }

  async search(term: string, locale?: string): Promise<Product[]> {
    return this.listProducts({ search: term, sort: 'relevance', perPage: 24, locale });
  }
}
