// Шапка витрины. Хостит слот global.header-nav (туда монтируется CategoryNav
// фичи catalog) и передаёт ему категории из активного CatalogSource.
import { Slot } from '@vitrine-kit/core/react';
import { getCatalogSource } from '@/lib/adapter';

export async function SiteHeader() {
  const source = await getCatalogSource();
  const categories = await source.listCategories();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-container items-center justify-between gap-gutter px-gutter py-unit">
        <a href="/" className="font-heading text-fg">
          <Slot name="global.header-start" fallback={<span>Vitrine</span>} />
        </a>
        <Slot name="global.header-nav" categories={categories} />
        <div className="flex items-center gap-unit">
          <Slot name="global.header-actions" />
        </div>
      </div>
    </header>
  );
}
