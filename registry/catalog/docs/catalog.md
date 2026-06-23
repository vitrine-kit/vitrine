# Фича: catalog

Просмотр ассортимента: сетка товаров, карточка товара, навигация по категориям.

## Компоненты
- `components/catalog/ProductGrid` — сетка (семантический список) из `ProductCard`.
- `components/catalog/ProductCard` — карточка (изображение, название, цена).
- `components/catalog/CategoryNav` — навигация; монтируется в слот `global.header-nav`.

## Данные
- `lib/catalog/data` — `loadProducts`/`loadProduct`/`loadCategories` поверх контракта `CatalogSource` + `formatPrice` (цена в минимальных единицах).
- `lib/catalog/register` — регистрация слота `global.header-nav`.

## Стилизация
Все классы — токенные (`bg-surface`, `text-fg`, `text-price`, `rounded-md`, `gap-gutter`). Дизайн-шаг меняет только значения токенов, не структуру/a11y.

## Контракты
Зависит только от `@vitrine-kit/contracts` (типы, `CatalogSource`) и `@vitrine-kit/core` (`registerSlot`). Переносима между Payload и Vendure.
