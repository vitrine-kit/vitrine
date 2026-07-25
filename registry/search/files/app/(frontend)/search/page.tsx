// Search results page. Query string `q` → CatalogSource.search.
import type { Metadata } from 'next';
import { getCatalogSource } from '@/lib/adapter';
import { loadSearch } from '@/lib/search/data';
import { SearchResults } from '@/components/search/SearchResults';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const term = q?.trim() ?? '';
  return {
    title: term ? `Search: ${term}` : 'Search',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const term = q?.trim() ?? '';
  const source = await getCatalogSource();
  const products = term ? await loadSearch(source, term) : [];

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Search</h1>
      </header>
      <SearchResults term={term} products={products} />
    </div>
  );
}
