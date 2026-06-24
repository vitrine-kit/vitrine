# Feature: product-page

The product detail page. Depends on `catalog` (registryDependencies).

## Components
- `components/product/ProductView` — the detail card. **Hosts the slots** `product.gallery`, `product.below-title`, `product.below-price`, `product.purchase`, `product.below-description`, `product.tabs` — other features (reviews, cart, wishlist) mount here.
- `components/product/ProductGallery` — the image gallery.

## Data
- `lib/product/data` — `loadProduct(source, slug)` over `CatalogSource.getProduct`.

## Slots
The feature doesn't register slots, it **provides** them: so adding reviews/cart doesn't require editing `ProductView`.

## Contracts
Only `@vitrine-kit/contracts` (types) and `@vitrine-kit/core/react` (`<Slot>`).
