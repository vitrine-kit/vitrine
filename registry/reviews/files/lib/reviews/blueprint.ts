import type { Extend } from '@vitrine-kit/contracts';

export function extendReviewsBlueprint(blueprint: { extend: Extend }): void {
  blueprint.extend('product', {
    addFields: [
      {
        name: 'reviews',
        type: 'json',
        label: 'Reviews',
      },
    ],
  });
}
