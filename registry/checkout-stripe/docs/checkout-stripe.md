# Фича: checkout-stripe (платёжный провайдер Stripe)

Провайдер Stripe Hosted Checkout для каркаса `checkout` (от него зависит). Ставится
вместо `checkout-paddle` / `checkout-yookassa` (взаимоисключающие). Критическая
логика (диспетчер вебхука, заказ из корзины) — в `@vitrine-kit/core`.

- **Провайдер:** `lib/checkout-stripe/provider.ts` → `stripeProvider`
  (`PaymentProvider`): `createCheckout` создаёт Stripe-сессию; `verifyWebhook`
  проверяет подпись Stripe SDK и нормализует событие.
- **Регистрация:** `registerCheckoutStripeProvider()` (зовётся из `lib/payments.ts`),
  ставит `integrations.payments: "stripe"` в `site.config`.
- **API (Next-glue):** `POST /api/webhooks/stripe` → `handlePaymentWebhook` →
  `fulfillOrderFromEvent` (общий код фичи `checkout`).
- **env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (обязательны).

Поток: корзина → `Оформить заказ` → редирект на Stripe → webhook
`checkout.session.completed` → заказ в админке, корзина `converted`.
