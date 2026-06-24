# @vitrine-kit/payload-blueprint

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

- fc9cb9b: M8: the base `carts` collection (lines JSON / currency / subtotal / discountTotal /
  total / status active|converted|abandoned / stripeSessionId) — cart
  persistence for `PayloadCommerceBackend`. Additive (the order of base collections:
  …orders, carts).
- 65062d9: M2: the base collections (products, variants, categories, media, users, orders) +
  the Blueprint contract implementation — `createBlueprint().extend()` additively adds
  fields, `build()` assembles the final collections and throws when overwriting an
  existing field. The binding to Payload buildConfig lives in the backend-payload template (M5).
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
