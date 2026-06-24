// Builds page metadata from domain types. SiteMetadata is structurally
// compatible with Next Metadata — in the client, generateMetadata() returns this.
import type { Product } from '@vitrine-kit/contracts';

export interface SiteMetadata {
  title: string;
  description?: string;
  canonical?: string;
  openGraph?: {
    title: string;
    description?: string;
    images?: string[];
  };
}

export function buildProductMetadata(
  product: Product,
  opts: { baseUrl?: string } = {},
): SiteMetadata {
  const title = product.seo?.title ?? product.title;
  const description = product.seo?.description ?? product.description;
  const image = product.seo?.image ?? product.images[0]?.url;
  const canonical = opts.baseUrl ? `${opts.baseUrl}/products/${product.slug}` : undefined;

  return {
    title,
    description,
    canonical,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
