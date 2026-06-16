# Фича: checkout-yookassa (платёжный провайдер ЮKassa)

Провайдер ЮKassa (yookassa.ru) — эквайринг РФ: карты, СБП, кошельки. Для каркаса
`checkout` (от него зависит). Ставится вместо `checkout-stripe` / `checkout-paddle`
(взаимоисключающие). SDK не нужен — REST `/v3/payments` + Basic-auth.

- **Провайдер:** `lib/checkout-yookassa/provider.ts` → `yookassaProvider`
  (`PaymentProvider`): `createCheckout` создаёт платёж (`confirmation.redirect`) →
  `confirmation_url`; `verifyWebhook` подтверждает платёж повторным запросом к API.
- **Регистрация:** `registerCheckoutYookassaProvider()` (из `lib/payments.ts`),
  ставит `integrations.payments: "yookassa"`.
- **API (Next-glue):** `POST /api/webhooks/yookassa` → `handlePaymentWebhook` →
  `fulfillOrderFromEvent`.
- **env:** `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` (обязательны).

**Безопасность:** уведомления ЮKassa **не подписаны** — провайдер перепроверяет
платёж через `GET /v3/payments/{id}` и доверяет только `status: "succeeded"`.

**Деньги:** ЮKassa ждёт десятичную строку (`"1990.00"`); `Money` — минимальные
единицы, поэтому делим на 100 (RUB и большинство валют — 2 знака).
