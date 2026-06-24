// Product grid — presentational, semantic list.
import type { Product } from '@vitrine-kit/contracts';
import { ProductCard } from './ProductCard.js';

export interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="text-muted-fg">No products found.</p>;
  }
  return (
    <ul
      role="list"
      className="vt-product-grid grid grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-4"
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
