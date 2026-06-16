// Идемпотентность создания заказа из webhook. Провайдеры ретраят доставку
// события (Stripe/Paddle/YooKassa) — без защиты это плодит дубликаты заказов.
// Решение — чистая функция в пакете (критлогика: баг = двойные заказы у всех
// клиентов); copy-in роут лишь подставляет состояние из БД.

export interface OrderCreationGuard {
  /** Статус корзины (карты Payload `carts`): 'converted' = уже оплачена. */
  cartStatus?: string | null;
  /** Референс платежа текущего события (session/transaction/payment id). */
  providerRef?: string;
  /** paymentRef уже существующих заказов (обычно результат точечного поиска). */
  existingOrderRefs?: ReadonlyArray<string | undefined>;
}

/**
 * Создавать ли заказ для этого события. false, если корзина уже converted ИЛИ
 * для этого референса платежа заказ уже есть (повторная доставка/ретрай webhook).
 */
export function shouldCreateOrder(guard: OrderCreationGuard): boolean {
  if (guard.cartStatus === 'converted') return false;
  if (guard.providerRef && (guard.existingOrderRefs ?? []).includes(guard.providerRef)) {
    return false;
  }
  return true;
}
