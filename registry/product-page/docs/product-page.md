# Фича: product-page

Детальная страница товара. Зависит от `catalog` (registryDependencies).

## Компоненты
- `components/product/ProductView` — детальная карточка. **Хостит слоты** `product.gallery`, `product.below-title`, `product.below-price`, `product.purchase`, `product.below-description`, `product.tabs` — сюда монтируются другие фичи (reviews, cart, wishlist).
- `components/product/ProductGallery` — галерея изображений.

## Данные
- `lib/product/data` — `loadProduct(source, slug)` поверх `CatalogSource.getProduct`.

## Слоты
Фича не регистрирует слоты, а **предоставляет** их: значит, добавление reviews/cart не требует правки `ProductView`.

## Контракты
Только `@maks417/contracts` (типы) и `@maks417/core/react` (`<Slot>`).
