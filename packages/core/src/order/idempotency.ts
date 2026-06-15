// Идемпотентность создания заказа из webhook. Stripe ретраит доставку события
// checkout.session.completed — без защиты это плодит дубликаты заказов. Решение —
// чистая функция в пакете (критлогика: баг = двойные заказы у всех клиентов);
// copy-in роут (registry/checkout-stripe) лишь подставляет состояние из Payload.

export interface OrderCreationGuard {
  /** Статус корзины (карты Payload `carts`): 'converted' = уже оплачена. */
  cartStatus?: string | null;
  /** id Stripe Checkout-сессии текущего события. */
  sessionId?: string;
  /** stripeSessionId уже существующих заказов (обычно результат точечного поиска). */
  existingOrderSessionIds?: ReadonlyArray<string | undefined>;
}

/**
 * Создавать ли заказ для этого события. false, если корзина уже converted ИЛИ
 * для этой Stripe-сессии заказ уже есть (повторная доставка/ретрай webhook).
 */
export function shouldCreateOrder(guard: OrderCreationGuard): boolean {
  if (guard.cartStatus === 'converted') return false;
  if (guard.sessionId && (guard.existingOrderSessionIds ?? []).includes(guard.sessionId)) {
    return false;
  }
  return true;
}
