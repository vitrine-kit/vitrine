// schema.org JSON-LD from domain types.
import type { Product } from '@vitrine-kit/contracts';

export function productJsonLd(
  product: Product,
  opts: { baseUrl?: string } = {},
): Record<string, unknown> {
  const variant = product.variants[0];
  const price = product.priceRange?.min ?? variant?.price;
  const currency = product.priceRange?.currency ?? variant?.currency;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.seo?.description ?? product.description,
    image: product.images.map((image) => image.url),
    sku: variant?.sku,
    offers:
      price != null
        ? {
            '@type': 'Offer',
            price: (price / 100).toFixed(2),
            priceCurrency: currency,
            url: opts.baseUrl ? `${opts.baseUrl}/products/${product.slug}` : undefined,
          }
        : undefined,
  };
}
