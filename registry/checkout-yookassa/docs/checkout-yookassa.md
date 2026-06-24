# Feature: checkout-yookassa (YooKassa payment provider)

A YooKassa (yookassa.ru) provider — Russian acquiring: cards, SBP, wallets. For the
`checkout` scaffold (which it depends on). Installed instead of `checkout-stripe` / `checkout-paddle`
(mutually exclusive). No SDK needed — REST `/v3/payments` + Basic auth.

- **Provider:** `lib/checkout-yookassa/provider.ts` → `yookassaProvider`
  (`PaymentProvider`): `createCheckout` creates a payment (`confirmation.redirect`) →
  `confirmation_url`; `verifyWebhook` confirms the payment with a follow-up request to the API.
- **Registration:** `registerCheckoutYookassaProvider()` (from `lib/payments.ts`),
  sets `integrations.payments: "yookassa"`.
- **API (Next glue):** `POST /api/webhooks/yookassa` → `handlePaymentWebhook` →
  `fulfillOrderFromEvent`.
- **env:** `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` (required).

**Security:** YooKassa notifications are **not signed** — the provider re-verifies the
payment via `GET /v3/payments/{id}` and trusts only `status: "succeeded"`.

**Money:** YooKassa expects a decimal string (`"1990.00"`); `Money` is in minor
units, so we divide by 100 (RUB and most currencies have 2 decimal places).
