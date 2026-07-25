// Product page. ProductView (the product-page feature) hosts the product.* slots.
// Metadata and JSON-LD come from the seo feature.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalogSource } from '@/lib/adapter';
import { loadProduct } from '@/lib/catalog/data';
import { getRequestLocale } from '@/lib/i18n/locale';
import { ProductView } from '@/components/product/ProductView';
import { buildProductMetadata } from '@/lib/seo/metadata';
import { productJsonLd } from '@/lib/seo/jsonld';
import { JsonLd } from '@/components/seo/JsonLd';
import { baseUrl } from '@/lib/site';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const source = await getCatalogSource();
  const product = await loadProduct(source, slug, locale);
  if (!product) return {};
  const meta = buildProductMetadata(product, { baseUrl });
  return {
    title: meta.title,
    description: meta.description,
    alternates: meta.canonical ? { canonical: meta.canonical } : undefined,
    openGraph: meta.openGraph,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const source = await getCatalogSource();
  const product = await loadProduct(source, slug, locale);
  if (!product) notFound();

  return (
    <>
      <JsonLd data={productJsonLd(product, { baseUrl })} />
      <ProductView product={product} />
    </>
  );
}
