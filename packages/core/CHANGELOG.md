# @vitrine-kit/core

## 0.1.0

### Minor Changes

- fc9cb9b: M8: корзинная арифметика и заказ (критическая денежная логика — в пакете).
  `commerce/cart` — чистые `emptyCart`/`addCartLine` (слияние одинаковых вариантов)/
  `setCartLineQty` (qty=0 удаляет)/`removeCartLine`/`recalcCart` (итоги + скидка)/
  `cartItemCount`. `commerce/order` — `buildOrderFromCart` (снимок корзины в заказ) и
  `cartToStripeLineItems` (нейтральная форма line_items, без Stripe SDK в ядре).
  Реализация `CommerceBackend` в шаблоне делегирует этим функциям, храня только
  персистентность; webhook (`handleStripeWebhook`) собирает заказ через
  `buildOrderFromCart`. Деньги — целое в минимальных единицах.
- 65062d9: M2: фреймворк-агностичный runtime. Реестр слотов (`createSlotRegistry`,
  `registerSlot`, `getSlotMounts`) + React `<Slot>` в подпути `@vitrine-kit/core/react`;
  реестр адаптеров (`createAdapterRegistry` → активный CatalogSource/CommerceBackend
  по site.config); каркас order pipeline (`runPipeline`) и Stripe webhook
  (`handleStripeWebhook` с инъектируемой верификацией). Order pipeline/webhook
  наполняются в M8.
- d340824: Провайдер-агностичные платежи. `@vitrine-kit/core` получает абстракцию `PaymentProvider`

  - реестр `payments` (зеркало adapter/resolver) и нейтральный `handlePaymentWebhook`;
    Stripe-специфичные `handleStripeWebhook`/`cartToStripeLineItems` удалены из ядра
    (переезжают в фичу `checkout-stripe`). `OrderCreationGuard` обобщён:
    `sessionId`→`providerRef`, `existingOrderSessionIds`→`existingOrderRefs`.

  `@vitrine-kit/contracts`: `integrations.payments` → `stripe | paddle | yookassa`;
  у манифеста фичи появился блок `payment: { provider }`.

  `@vitrine-kit/payload-blueprint`: поля `orders.stripeSessionId`/`carts.stripeSessionId`
  переименованы в `paymentRef`, у `orders` добавлен `paymentProvider`.

  `@vitrine-kit/vitrine` (CLI): генерирует `lib/payments.ts` (регистрация провайдеров) и
  проставляет активный провайдер в `site.config` при установке фичи `checkout-<provider>`.

### Patch Changes

- Updated dependencies [65062d9]
- Updated dependencies [d340824]
  - @vitrine-kit/contracts@1.0.0
