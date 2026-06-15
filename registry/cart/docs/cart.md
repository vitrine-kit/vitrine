# Фича: cart (корзина)

Корзина для уровней `simple-store` / `full-store`. Зависит только от контрактов:
данные — через `CommerceBackend`, арифметика — в `@maks417/core` (критлогика).

- **Компоненты:** `CartView`, `CartLineItem`, `CartSummary` (хостит слот `cart.summary`),
  `AddToCart` (клиентский, слот `product.purchase`), `CartIndicator` (слот `global.header-actions`).
- **Маршруты/API (Next-glue):** `/cart` (страница), `POST/PATCH/DELETE /api/cart`
  (cart-id в httpOnly cookie, мутации через `CommerceBackend`).
- **Слоты:** `product.purchase` → `AddToCart`; `global.header-actions` → `CartIndicator`;
  хостит `cart.summary` (туда checkout-stripe ставит кнопку оформления).

Стилизуется токенами; ИИ-шаг дизайна не трогает поведение.
