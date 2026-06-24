# @vitrine-kit/core

## 0.2.1

### Patch Changes

- 610d52e: English-only product: all user-facing text is now English. The CLI's output and the
  artifacts it generates into the client repo (`README.md`, `CLAUDE.md`, `.env.example`,
  `.claude/commands/*`, `AGENTS.md`) are in English, as are runtime error messages across
  `@vitrine-kit/core` and `@vitrine-kit/payload-blueprint`, and the demo seed (English
  products/categories). The default `site.config` i18n is now `defaultLocale: 'en'`,
  `locales: ['en']`, `currency: 'USD'` (previously `ru`/`['ru']`/`'RUB'`) — explicit values
  in an existing client's `site.config` are unaffected.
- Updated dependencies [610d52e]
  - @vitrine-kit/contracts@1.2.0

## 0.2.0

### Minor Changes

- 9d4ae82: Move to the `vitrine-kit` organization: packages renamed from the `@maks417/*` scope to
  `@vitrine-kit/*` and published to the **public npm** (npmjs.com, with provenance) instead of private
  GitHub Packages. License — **MIT**. Installation no longer requires a token/PAT: not for client repos,
  not for CI, not for the Docker build. Inside the monorepo packages are still linked via `workspace:*`.

### Patch Changes

- Updated dependencies [9d4ae82]
  - @vitrine-kit/contracts@1.1.0

## 0.1.0

### Minor Changes

- fc9cb9b: M8: cart arithmetic and the order (critical money logic — in the package).
  `commerce/cart` — pure `emptyCart`/`addCartLine` (merging identical variants)/
  `setCartLineQty` (qty=0 removes)/`removeCartLine`/`recalcCart` (totals + discount)/
  `cartItemCount`. `commerce/order` — `buildOrderFromCart` (a cart snapshot into an order) and
  `cartToStripeLineItems` (a neutral line_items shape, no Stripe SDK in the core).
  The `CommerceBackend` implementation in the template delegates to these functions, keeping only
  persistence; the webhook (`handleStripeWebhook`) assembles the order via
  `buildOrderFromCart`. Money is an integer in minor units.
- 65062d9: M2: a framework-agnostic runtime. The slot registry (`createSlotRegistry`,
  `registerSlot`, `getSlotMounts`) + React `<Slot>` in the `@vitrine-kit/core/react` subpath;
  the adapter registry (`createAdapterRegistry` → the active CatalogSource/CommerceBackend
  by site.config); the order pipeline scaffold (`runPipeline`) and the Stripe webhook
  (`handleStripeWebhook` with injectable verification). The order pipeline/webhook
  are filled in in M8.
- d340824: Provider-agnostic payments. `@vitrine-kit/core` gains a `PaymentProvider` abstraction

  - the `payments` registry (mirror of adapter/resolver) and a neutral `handlePaymentWebhook`;
    the Stripe-specific `handleStripeWebhook`/`cartToStripeLineItems` are removed from the core
    (they move into the `checkout-stripe` feature). `OrderCreationGuard` is generalized:
    `sessionId`→`providerRef`, `existingOrderSessionIds`→`existingOrderRefs`.

  `@vitrine-kit/contracts`: `integrations.payments` → `stripe | paddle | yookassa`;
  the feature manifest gains a `payment: { provider }` block.

  `@vitrine-kit/payload-blueprint`: the `orders.stripeSessionId`/`carts.stripeSessionId` fields
  are renamed to `paymentRef`, and `orders` gains `paymentProvider`.

  `@vitrine-kit/vitrine` (CLI): generates `lib/payments.ts` (provider registration) and
  sets the active provider in `site.config` when a `checkout-<provider>` feature is installed.

### Patch Changes

- Updated dependencies [65062d9]
- Updated dependencies [d340824]
  - @vitrine-kit/contracts@1.0.0
