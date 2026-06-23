// Доступ к корзине через контракт CommerceBackend + форматирование цены.
// Арифметика корзины — в @vitrine-kit/core (критлогика), сюда приходит готовый Cart.
import type { Cart, CommerceBackend } from '@vitrine-kit/contracts';

export async function loadCart(commerce: CommerceBackend, cartId: string): Promise<Cart | null> {
  return commerce.getCart(cartId);
}

/** Money — минимальные единицы (копейки); делим на 100 для 2-знаковых валют. */
export function formatMoney(amount: number, currency: string, locale = 'ru-RU'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
