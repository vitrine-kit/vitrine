import { registerSlot } from '@vitrine-kit/core';
import { WishlistButton } from '../../components/wishlist/WishlistButton.js';
import { WishlistIndicator } from '../../components/wishlist/WishlistIndicator.js';

export function registerWishlistSlots(): void {
  registerSlot({ slot: 'product.below-price', component: WishlistButton, order: 20 });
  registerSlot({ slot: 'global.header-actions', component: WishlistIndicator, order: 15 });
}
