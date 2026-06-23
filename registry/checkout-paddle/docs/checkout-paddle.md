# Фича: checkout-paddle (платёжный провайдер Paddle)

Провайдер Paddle Billing для каркаса `checkout` (от него зависит). Ставится вместо
`checkout-stripe` / `checkout-yookassa` (взаимоисключающие). Paddle — Merchant of
Record: берёт на себя налоги/НДС. Критлогика (диспетчер вебхука, заказ из корзины) —
в `@vitrine-kit/core`.

- **Провайдер:** `lib/checkout-paddle/provider.ts` → `paddleProvider`
  (`PaymentProvider`): `createCheckout` создаёт Paddle transaction с non-catalog
  line items (цены из корзины, `customData.cartId`); `verifyWebhook` проверяет
  подпись `Paddle-Signature` через `@paddle/paddle-node-sdk`.
- **Регистрация:** `registerCheckoutPaddleProvider()` (из `lib/payments.ts`), ставит
  `integrations.payments: "paddle"`.
- **API (Next-glue):** `POST /api/webhooks/paddle` → `handlePaymentWebhook` →
  `fulfillOrderFromEvent` (на `transaction.completed`/`transaction.paid`).
- **env:** `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` (обязательны);
  `PADDLE_ENVIRONMENT` (`sandbox`|`production`, по умолчанию `sandbox`),
  `PADDLE_CHECKOUT_URL` (override hosted-checkout, иначе нужен default payment link
  в дашборде Paddle) — опциональны.

Суммы Paddle ждёт строкой в минимальных единицах валюты — совпадает с `Money`,
поэтому передаём `String(unitPrice)` как есть.
