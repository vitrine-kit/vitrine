# Feature: catalog

Browsing the assortment: product grid, product card, category navigation.

## Components
- `components/catalog/ProductGrid` — grid (semantic list) of `ProductCard`s.
- `components/catalog/ProductCard` — card (image, title, price).
- `components/catalog/CategoryNav` — navigation; mounted into the `global.header-nav` slot.

## Data
- `lib/catalog/data` — `loadProducts`/`loadProduct`/`loadCategories` over the `CatalogSource` contract + `formatPrice` (price in minor units).
- `lib/catalog/register` — registers the `global.header-nav` slot.

## Styling
All classes are token-based (`bg-surface`, `text-fg`, `text-price`, `rounded-md`, `gap-gutter`). The design step changes only token values, not structure/a11y.

## Contracts
Depends only on `@vitrine-kit/contracts` (types, `CatalogSource`) and `@vitrine-kit/core` (`registerSlot`). Portable between Payload and Vendure.
