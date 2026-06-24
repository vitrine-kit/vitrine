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
import type { ProductDoc, VariantDoc } from './payload-types.js';

function sortExpr(sort?: ProductSort): string {
  switch (sort) {
    case 'price-asc':
      return 'createdAt'; // price lives in the variants collection — price sorting is provided by the filters feature
    case 'price-desc':
      return '-createdAt';
    default: // newest and unspecified sort
      return '-createdAt';
  }
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
    const where = query.category ? { 'categories.slug': { equals: query.category } } : {};
    const res = await this.payload.find({
      collection: 'products',
      where,
      depth: 1,
      limit: query.perPage ?? 24,
      page: query.page ?? 1,
      sort: sortExpr(query.sort),
    });
    return Promise.all(res.docs.map((d) => this.withVariants(d as unknown as ProductDoc)));
  }

  async getProduct(slug: string): Promise<Product | null> {
    const res = await this.payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      depth: 1,
      limit: 1,
    });
    const doc = res.docs[0];
    return doc ? this.withVariants(doc as unknown as ProductDoc) : null;
  }

  async listCategories(): Promise<Category[]> {
    const res = await this.payload.find({ collection: 'categories', depth: 0, limit: 200 });
    return res.docs.map((d) => mapCategory(d as unknown as never));
  }

  async search(term: string): Promise<Product[]> {
    const res = await this.payload.find({
      collection: 'products',
      where: { title: { like: term } },
      depth: 1,
      limit: 24,
    });
    return Promise.all(res.docs.map((d) => this.withVariants(d as unknown as ProductDoc)));
  }
}
