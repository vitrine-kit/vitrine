import { registerSlot } from '@vitrine-kit/core';
import { ReviewList } from '../../components/reviews/ReviewList.js';

export function registerReviewsSlots(): void {
  registerSlot({ slot: 'product.below-description', component: ReviewList, order: 20 });
}
