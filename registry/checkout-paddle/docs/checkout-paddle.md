# Feature: checkout-paddle (Paddle payment provider)

A Paddle Billing provider for the `checkout` scaffold (which it depends on). Installed instead of
`checkout-stripe` / `checkout-yookassa` (mutually exclusive). Paddle is a Merchant of
Record: it handles taxes/VAT. The critical logic (webhook dispatcher, order from cart) lives
in `@vitrine-kit/core`.

- **Provider:** `lib/checkout-paddle/provider.ts` → `paddleProvider`
  (`PaymentProvider`): `createCheckout` creates a Paddle transaction with non-catalog
  line items (prices from the cart, `customData.cartId`); `verifyWebhook` verifies the
  `Paddle-Signature` via `@paddle/paddle-node-sdk`.
- **Registration:** `registerCheckoutPaddleProvider()` (from `lib/payments.ts`), sets
  `integrations.payments: "paddle"`.
- **API (Next glue):** `POST /api/webhooks/paddle` → `handlePaymentWebhook` →
  `fulfillOrderFromEvent` (on `transaction.completed`/`transaction.paid`).
- **env:** `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` (required);
  `PADDLE_ENVIRONMENT` (`sandbox`|`production`, default `sandbox`),
  `PADDLE_CHECKOUT_URL` (override the hosted checkout, otherwise a default payment link
  in the Paddle dashboard is required) — optional.

Paddle expects amounts as a string in the currency's minor units — this matches `Money`,
so we pass `String(unitPrice)` as-is.
