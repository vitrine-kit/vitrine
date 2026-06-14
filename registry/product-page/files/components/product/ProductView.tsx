// Карточка товара (детальная). ХОСТИТ слоты product.* — другие фичи (reviews,
// cart, wishlist) монтируются в них, не правя этот компонент.
import type { Product } from '@maks417/contracts';
import { Slot } from '@maks417/core/react';
import { ProductGallery } from './ProductGallery.js';
import { formatPrice } from '../../lib/product/data.js';

export interface ProductViewProps {
  product: Product;
}

export function ProductView({ product }: ProductViewProps) {
  const price = product.priceRange?.min ?? product.variants[0]?.price;
  const currency = product.priceRange?.currency ?? product.variants[0]?.currency ?? 'USD';

  return (
    <article className="vt-product-view grid gap-section md:grid-cols-2">
      <div>
        <Slot
          name="product.gallery"
          fallback={<ProductGallery images={product.images} title={product.title} />}
        />
      </div>
      <div className="flex flex-col gap-gutter">
        <Slot name="product.below-title" />
        <h1 className="font-heading text-fg">{product.title}</h1>
        {price != null ? (
          <p className="text-price text-xl">{formatPrice(price, currency)}</p>
        ) : null}
        <Slot name="product.below-price" />
        <div className="vt-product-purchase">
          <Slot name="product.purchase" />
        </div>
        {product.description ? (
          <div className="vt-product-description text-fg">{product.description}</div>
        ) : null}
        <Slot name="product.below-description" />
        <Slot name="product.tabs" />
      </div>
    </article>
  );
}
