// Регистрация слотов фичи checkout-stripe. Кнопка оформления — в итогах корзины.
import { registerSlot } from '@maks417/core';
import { CheckoutButton } from '../../components/checkout/CheckoutButton.js';

export function registerCheckoutStripeSlots(): void {
  registerSlot({ slot: 'cart.summary', component: CheckoutButton, order: 10 });
}
