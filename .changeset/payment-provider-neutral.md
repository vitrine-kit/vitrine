---
"@maks417/contracts": minor
"@maks417/core": minor
"@maks417/payload-blueprint": minor
"@maks417/vitrine": minor
---

Провайдер-агностичные платежи. `@maks417/core` получает абстракцию `PaymentProvider`
+ реестр `payments` (зеркало adapter/resolver) и нейтральный `handlePaymentWebhook`;
Stripe-специфичные `handleStripeWebhook`/`cartToStripeLineItems` удалены из ядра
(переезжают в фичу `checkout-stripe`). `OrderCreationGuard` обобщён:
`sessionId`→`providerRef`, `existingOrderSessionIds`→`existingOrderRefs`.

`@maks417/contracts`: `integrations.payments` → `stripe | paddle | yookassa`;
у манифеста фичи появился блок `payment: { provider }`.

`@maks417/payload-blueprint`: поля `orders.stripeSessionId`/`carts.stripeSessionId`
переименованы в `paymentRef`, у `orders` добавлен `paymentProvider`.

`@maks417/vitrine` (CLI): генерирует `lib/payments.ts` (регистрация провайдеров) и
проставляет активный провайдер в `site.config` при установке фичи `checkout-<provider>`.
