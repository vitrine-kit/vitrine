---
"@maks417/core": minor
---

M8: корзинная арифметика и заказ (критическая денежная логика — в пакете).
`commerce/cart` — чистые `emptyCart`/`addCartLine` (слияние одинаковых вариантов)/
`setCartLineQty` (qty=0 удаляет)/`removeCartLine`/`recalcCart` (итоги + скидка)/
`cartItemCount`. `commerce/order` — `buildOrderFromCart` (снимок корзины в заказ) и
`cartToStripeLineItems` (нейтральная форма line_items, без Stripe SDK в ядре).
Реализация `CommerceBackend` в шаблоне делегирует этим функциям, храня только
персистентность; webhook (`handleStripeWebhook`) собирает заказ через
`buildOrderFromCart`. Деньги — целое в минимальных единицах.
