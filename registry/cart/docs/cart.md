# Feature: cart

The cart for the `simple-store` / `full-store` tiers. Depends only on the contracts:
data goes through `CommerceBackend`, the arithmetic lives in `@vitrine-kit/core` (critical logic).

- **Components:** `CartView`, `CartLineItem`, `CartSummary` (hosts the `cart.summary` slot),
  `AddToCart` (client component, `product.purchase` slot), `CartIndicator` (`global.header-actions` slot).
- **Routes/API (Next glue):** `/cart` (page), `POST/PATCH/DELETE /api/cart`
  (cart id in an httpOnly cookie, mutations via `CommerceBackend`).
- **Slots:** `product.purchase` → `AddToCart`; `global.header-actions` → `CartIndicator`;
  hosts `cart.summary` (where checkout-stripe places the checkout button).

Styled with tokens; the AI design step doesn't touch behavior.
