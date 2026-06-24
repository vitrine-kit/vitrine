# Feature: checkout-stripe (Stripe payment provider)

A Stripe Hosted Checkout provider for the `checkout` scaffold (which it depends on). Installed
instead of `checkout-paddle` / `checkout-yookassa` (mutually exclusive). The critical
logic (webhook dispatcher, order from cart) lives in `@vitrine-kit/core`.

- **Provider:** `lib/checkout-stripe/provider.ts` → `stripeProvider`
  (`PaymentProvider`): `createCheckout` creates a Stripe session; `verifyWebhook`
  verifies the signature via the Stripe SDK and normalizes the event.
- **Registration:** `registerCheckoutStripeProvider()` (called from `lib/payments.ts`),
  sets `integrations.payments: "stripe"` in `site.config`.
- **API (Next glue):** `POST /api/webhooks/stripe` → `handlePaymentWebhook` →
  `fulfillOrderFromEvent` (the `checkout` feature's shared code).
- **env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (required).

Flow: cart → `Checkout` → redirect to Stripe → webhook
`checkout.session.completed` → order in the admin, cart `converted`.
