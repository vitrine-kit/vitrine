# Фича: checkout (оформление заказа)

Провайдер-агностичный каркас оформления для `simple-store` / `full-store`. Зависит
от фичи `cart`. Сам по себе платежей НЕ проводит — добавьте одну из фич провайдера:
`checkout-stripe`, `checkout-paddle` или `checkout-yookassa` (ровно одну).

- **Компонент:** `CheckoutButton` (клиентский) — слот `cart.summary`. Зовёт
  `POST /api/checkout` и редиректит на URL провайдера. О провайдере не знает.
- **API (Next-glue):** `POST /api/checkout` — `CommerceBackend.startCheckout`
  делегирует активному провайдеру (`payments.resolve` по `integrations.payments`).
- **Общий код вебхуков:** `lib/checkout/fulfill.ts` → `fulfillOrderFromEvent` —
  идемпотентное создание заказа из нормализованного события (используют все роуты
  вебхуков провайдеров). Критлогика (дедуп по `paymentRef`, снимок заказа) — в
  `@maks417/core` (`shouldCreateOrder`, `buildOrderFromCart`).

Поток: корзина → `Оформить заказ` → `POST /api/checkout` → редирект к провайдеру →
вебхук провайдера → `fulfillOrderFromEvent` → заказ в админке, корзина `converted`.
