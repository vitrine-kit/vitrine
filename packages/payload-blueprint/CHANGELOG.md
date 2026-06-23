# @vitrine-kit/payload-blueprint

## 0.2.0

### Minor Changes

- 9d4ae82: Перенос в организацию `vitrine-kit`: пакеты переименованы со scope `@maks417/*` на
  `@vitrine-kit/*` и публикуются в **публичный npm** (npmjs.com, с provenance) вместо приватного
  GitHub Packages. Лицензия — **MIT**. Установка больше не требует токена/PAT: ни клиентским репо,
  ни CI, ни Docker-сборке. Внутри монорепо пакеты по-прежнему линкуются через `workspace:*`.

### Patch Changes

- Updated dependencies [9d4ae82]
  - @vitrine-kit/contracts@1.1.0

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
