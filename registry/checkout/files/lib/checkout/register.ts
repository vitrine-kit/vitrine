// Registers the checkout feature's slots. The checkout button goes in the cart totals.
// The payment provider is registered separately — in the checkout-<provider> feature.
import { registerSlot } from '@vitrine-kit/core';
import { CheckoutButton } from '../../components/checkout/CheckoutButton.js';

export function registerCheckoutSlots(): void {
  registerSlot({ slot: 'cart.summary', component: CheckoutButton, order: 10 });
}
