// Search results — presentational. Hosts search.results-top / search.empty slots.
// Inline cards (not ProductGrid) so the feature typechecks without cross-feature imports.
import type { Product } from '@vitrine-kit/contracts';
import { Slot } from '@vitrine-kit/core/react';

export interface SearchResultsProps {
  term: string;
  products: Product[];
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

export function SearchResults({ term, products }: SearchResultsProps) {
  if (!term) {
    return (
      <p className="text-muted-fg">Type a query in the header search to find products.</p>
    );
  }

  if (products.length === 0) {
    return (
      <div className="vt-search-empty flex flex-col gap-gutter">
        <Slot name="search.empty" term={term} />
        <p className="text-muted-fg">
          No products matched <span className="text-fg">“{term}”</span>.
        </p>
        <a
          href="/"
          className="w-fit rounded-md border border-border px-gutter py-unit text-fg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Browse catalog
        </a>
      </div>
    );
  }

  return (
    <div className="vt-search-results flex flex-col gap-gutter">
      <Slot name="search.results-top" term={term} products={products} />
      <p className="text-sm text-muted-fg">
        {products.length} result{products.length === 1 ? '' : 's'} for “{term}”
      </p>
      <ul role="list" className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const price = product.priceRange?.min ?? product.variants[0]?.price;
          const currency = product.priceRange?.currency ?? product.variants[0]?.currency ?? 'USD';
          const image = product.images[0];
          return (
            <li key={product.id}>
              <article className="vt-product-card rounded-md border border-border bg-surface text-surface-fg">
                <a
                  href={`/products/${product.slug}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 ring-ring"
                >
                  {image ? (
                    <img
                      src={image.url}
                      alt={image.alt ?? product.title}
                      width={image.width}
                      height={image.height}
                      loading="lazy"
                      className="aspect-square w-full rounded-t-md object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-t-md bg-muted" aria-hidden="true" />
                  )}
                  <div className="p-gutter">
                    <h3 className="font-heading text-fg">{product.title}</h3>
                    {price != null ? (
                      <p className="text-price">
                        {product.priceRange && product.priceRange.min !== product.priceRange.max
                          ? `From ${formatPrice(price, currency)}`
                          : formatPrice(price, currency)}
                      </p>
                    ) : null}
                  </div>
                </a>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
