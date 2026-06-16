# @maks417/payload-blueprint

## 0.1.0

### Minor Changes

- fc9cb9b: M8: базовая коллекция `carts` (lines JSON / currency / subtotal / discountTotal /
  total / status active|converted|abandoned / stripeSessionId) — персистентность
  корзины для `PayloadCommerceBackend`. Аддитивно (порядок базовых коллекций:
  …orders, carts).
- 65062d9: M2: базовые коллекции (products, variants, categories, media, users, orders) +
  реализация контракта Blueprint — `createBlueprint().extend()` аддитивно добавляет
  поля, `build()` собирает финальные коллекции и бросает при перетирании
  существующего поля. Привязка к Payload buildConfig — в шаблоне backend-payload (M5).
- d340824: Провайдер-агностичные платежи. `@maks417/core` получает абстракцию `PaymentProvider`

  - реестр `payments` (зеркало adapter/resolver) и нейтральный `handlePaymentWebhook`;
    Stripe-специфичные `handleStripeWebhook`/`cartToStripeLineItems` удалены из ядра
    (переезжают в фичу `checkout-stripe`). `OrderCreationGuard` обобщён:
    `sessionId`→`providerRef`, `existingOrderSessionIds`→`existingOrderRefs`.

  `@maks417/contracts`: `integrations.payments` → `stripe | paddle | yookassa`;
  у манифеста фичи появился блок `payment: { provider }`.

  `@maks417/payload-blueprint`: поля `orders.stripeSessionId`/`carts.stripeSessionId`
  переименованы в `paymentRef`, у `orders` добавлен `paymentProvider`.

  `@maks417/vitrine` (CLI): генерирует `lib/payments.ts` (регистрация провайдеров) и
  проставляет активный провайдер в `site.config` при установке фичи `checkout-<provider>`.

### Patch Changes

- Updated dependencies [65062d9]
- Updated dependencies [d340824]
  - @maks417/contracts@1.0.0
