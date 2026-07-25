# Feature: wishlist

Client-side wishlist (localStorage). No backend — works on every tier including catalog-only.

## Modules
- `WishlistButton` — toggle on the product page (`product.below-price`)
- `WishlistIndicator` — header link with count (`global.header-actions`)
- `/wishlist` — list of saved product slugs resolved via `CatalogSource`

## Note
Guest-only. Clearing site data clears the wishlist. Accounts can later sync this storage.
