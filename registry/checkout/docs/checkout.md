# Feature: checkout

A provider-agnostic checkout scaffold for `simple-store` / `full-store`. Depends on the
`cart` feature. It does NOT process payments on its own — add one of the provider features:
`checkout-stripe`, `checkout-paddle`, or `checkout-yookassa` (exactly one).

- **Component:** `CheckoutButton` (client component) — `cart.summary` slot. Calls
  `POST /api/checkout` and redirects to the provider URL. It knows nothing about the provider.
- **API (Next glue):** `POST /api/checkout` — `CommerceBackend.startCheckout`
  delegates to the active provider (`payments.resolve` by `integrations.payments`).
- **Shared webhook code:** `lib/checkout/fulfill.ts` → `fulfillOrderFromEvent` —
  idempotent order creation from a normalized event (used by all provider webhook
  routes). The critical logic (dedup by `paymentRef`, order snapshot) lives in
  `@vitrine-kit/core` (`shouldCreateOrder`, `buildOrderFromCart`).

Flow: cart → `Checkout` → `POST /api/checkout` → redirect to the provider →
provider webhook → `fulfillOrderFromEvent` → order in the admin, cart `converted`.
