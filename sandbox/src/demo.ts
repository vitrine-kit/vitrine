// Demo: slots + blueprint work on the same contracts.
// Run: pnpm build && pnpm --filter sandbox demo
import { createSlotRegistry } from '@vitrine-kit/core';
import { createBlueprint } from '@vitrine-kit/payload-blueprint';

// --- Slots: register components by name, read them in order ---
const slots = createSlotRegistry<string>();
slots.register({ slot: 'product.below-description', component: 'ReviewList', order: 20 });
slots.register({ slot: 'product.below-description', component: 'QnA', order: 10 });

console.log(
  'slot product.below-description →',
  slots.get('product.below-description').map((m) => m.component),
); // ['QnA', 'ReviewList']

// --- Blueprint: a feature additively extends the product collection ---
const bp = createBlueprint();
bp.extend('product', { addFields: [{ name: 'reviewsEnabled', type: 'checkbox' }] });

const products = bp.build().find((c) => c.slug === 'products');
console.log('products fields →', products?.fields.map((field) => field.name));

console.log('[sandbox] ok');
