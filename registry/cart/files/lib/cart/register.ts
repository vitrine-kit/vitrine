// Регистрация слотов фичи cart. Клиент вызывает это из lib/slots.ts.
// AddToCart — на странице товара (product.purchase), CartIndicator — в шапке.
import { registerSlot } from '@vitrine-kit/core';
import { AddToCart } from '../../components/cart/AddToCart.js';
import { CartIndicator } from '../../components/cart/CartIndicator.js';

export function registerCartSlots(): void {
  registerSlot({ slot: 'product.purchase', component: AddToCart, order: 10 });
  registerSlot({ slot: 'global.header-actions', component: CartIndicator, order: 20 });
}
