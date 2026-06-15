# Фича: checkout-stripe (оформление заказа)

Stripe hosted checkout для `simple-store` / `full-store`. Зависит от фичи `cart`.
Критическая логика (подпись webhook, заказ из корзины) — в `@maks417/core`.

- **Компонент:** `CheckoutButton` (клиентский) — слот `cart.summary`.
- **API (Next-glue):** `POST /api/checkout` (создаёт Stripe-сессию через
  `CommerceBackend.startCheckout`), `POST /api/webhooks/stripe` (проверяет подпись
  Stripe SDK → `handleStripeWebhook` → `buildOrderFromCart` → заказ в Payload).
- **env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (обязательны).

Поток: корзина → `Оформить заказ` → редирект на Stripe → webhook
`checkout.session.completed` → заказ в админке, корзина помечается `converted`.
