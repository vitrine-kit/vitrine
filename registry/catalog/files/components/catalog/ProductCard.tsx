// Карточка товара — презентационная, визуально нейтральная (классы → токены).
// Структуру/a11y дизайн-шаг не трогает, только токены.
import type { Product } from '@vitrine-kit/contracts';
import { formatPrice } from '../../lib/catalog/data.js';

export interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const price = product.priceRange?.min ?? product.variants[0]?.price;
  const currency = product.priceRange?.currency ?? product.variants[0]?.currency ?? 'USD';
  const image = product.images[0];

  return (
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
            <p className="text-price">{formatPrice(price, currency)}</p>
          ) : null}
        </div>
      </a>
    </article>
  );
}
