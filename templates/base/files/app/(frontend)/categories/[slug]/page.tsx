// Category listing. Filtered by category slug via the CatalogSource contract.
import { notFound } from 'next/navigation';
import { Slot } from '@vitrine-kit/core/react';
import { getCatalogSource } from '@/lib/adapter';
import { loadCategories, loadProducts } from '@/lib/catalog/data';
import { ProductGrid } from '@/components/catalog/ProductGrid';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const source = await getCatalogSource();
  const category = (await loadCategories(source)).find((c) => c.slug === slug);
  if (!category) notFound();

  const products = await loadProducts(source, { category: slug });

  return (
    <div className="flex flex-col gap-section">
      <Slot name="category.header" category={category} />
      <h1 className="font-heading text-fg">{category.title}</h1>
      <ProductGrid products={products} />
      <Slot name="category.below-products" />
    </div>
  );
}
