# Feature: checkout

A provider-agnostic checkout scaffold for `simple-store` / `full-store`. Depends on the
`cart` feature. It does NOT process payments on its own — add one of the provider features:
`checkout-stripe`, `checkout-paddle`, or `checkout-yookassa` (exactly one).

- **Component:** `CheckoutButton` (client component) — `cart.summary` slot. Calls
  `POST /api/checkout` and redirects to the provider URL. It knows nothing about the provider.
- **API (Next glue):** `POST /api/checkout` — `CommerceBackend.startCheckout`
  delegates to the active provider (`payments.resolve` by `integrations.payments`).
- **Success page:** `app/(frontend)/order/success` — post-payment landing (`order.*` slots).
- **Shared webhook code:** `lib/checkout/fulfill.ts` → `fulfillOrderFromEvent` —
  idempotent order creation from a normalized event (used by all provider webhook
  routes). The critical logic (dedup by `paymentRef`, order snapshot) lives in
  `@vitrine-kit/core` (`shouldCreateOrder`, `buildOrderFromCart`).
- **Email:** `lib/checkout/notify.ts` — after fulfill, calls `payload.sendEmail` when the
  `email` feature + SMTP (or console adapter) is configured; otherwise logs to the server console.

Flow: cart → `Checkout` → `POST /api/checkout` → redirect to the provider →
provider webhook → `fulfillOrderFromEvent` → order in the admin, cart `converted` →
confirmation email (or console log).

## Shipping and tax (v1 scope)

This kit uses **hosted checkout** (Stripe Checkout / Paddle / YooKassa). There is no
in-store multi-step address form.

| Concern | v1 behavior |
|---|---|
| **Shipping address** | Collected by the payment provider on their hosted page (when enabled in the PSP dashboard). Not stored on the Payload cart/order beyond what the webhook returns (email). |
| **Shipping rates** | Configure in the PSP (Stripe Shipping Rates, etc.). The storefront does not compute rates. |
| **Tax / VAT** | Prefer PSP tax (Stripe Tax, Paddle VAT). Cart/order only expose optional `discountTotal` — no tax engine in `@vitrine-kit/core` yet. |
| **Digital goods** | Leave shipping disabled in the PSP; customers still get `/order/success` after pay. |

Physical-goods merchants should enable shipping/tax in the chosen provider dashboard before going live.
