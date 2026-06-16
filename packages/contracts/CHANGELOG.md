# @maks417/contracts

## 1.0.0

### Major Changes

- 65062d9: M1: первая стабильная версия контрактов (1.0.0). Пять контрактов — Tokens, Data
  (CatalogSource/CommerceBackend + нормализованные типы), Slots (замкнутый набор из
  32 слотов), Config (site.config), Blueprint (аддитивный extend). Zod-схемы
  манифестов (feature.json, vitrine.json, registry \_index.json) и генерация
  JSON Schema в schemas/ из единого источника (zod). Расширять только аддитивно.

### Minor Changes

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
