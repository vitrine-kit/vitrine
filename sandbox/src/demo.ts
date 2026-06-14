// Демо: слоты + blueprint работают на одних контрактах.
// Запуск: pnpm build && pnpm --filter sandbox demo
import { createSlotRegistry } from '@maks417/core';
import { createBlueprint } from '@maks417/payload-blueprint';

// --- Слоты: регистрируем компоненты по имени, читаем в порядке order ---
const slots = createSlotRegistry<string>();
slots.register({ slot: 'product.below-description', component: 'ReviewList', order: 20 });
slots.register({ slot: 'product.below-description', component: 'QnA', order: 10 });

console.log(
  'slot product.below-description →',
  slots.get('product.below-description').map((m) => m.component),
); // ['QnA', 'ReviewList']

// --- Blueprint: фича аддитивно расширяет коллекцию product ---
const bp = createBlueprint();
bp.extend('product', { addFields: [{ name: 'reviewsEnabled', type: 'checkbox' }] });

const products = bp.build().find((c) => c.slug === 'products');
console.log('products fields →', products?.fields.map((field) => field.name));

console.log('[sandbox] ok');
