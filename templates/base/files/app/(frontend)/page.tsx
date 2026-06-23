// Главная витрины: листинг каталога. Данные — через контракт CatalogSource
// (бэкенд-агностично), сетка — компонент фичи catalog.
import { Slot } from '@vitrine-kit/core/react';
import { getCatalogSource } from '@/lib/adapter';
import { loadProducts } from '@/lib/catalog/data';
import { ProductGrid } from '@/components/catalog/ProductGrid';

export default async function HomePage() {
  const source = await getCatalogSource();
  const products = await loadProducts(source, { perPage: 12 });

  return (
    <div className="flex flex-col gap-section">
      <Slot name="home.hero" />
      <section aria-labelledby="catalog-heading" className="flex flex-col gap-gutter">
        <h1 id="catalog-heading" className="font-heading text-fg">
          Каталог
        </h1>
        <Slot name="catalog.grid-top" />
        <ProductGrid products={products} />
        <Slot name="catalog.grid-bottom" />
      </section>
      <Slot name="home.sections" />
      <Slot name="home.bottom" />
    </div>
  );
}
