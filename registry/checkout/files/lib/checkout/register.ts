// Регистрация слотов фичи checkout. Кнопка оформления — в итогах корзины.
// Платёжный провайдер регистрируется отдельно — в фиче checkout-<provider>.
import { registerSlot } from '@maks417/core';
import { CheckoutButton } from '../../components/checkout/CheckoutButton.js';

export function registerCheckoutSlots(): void {
  registerSlot({ slot: 'cart.summary', component: CheckoutButton, order: 10 });
}
