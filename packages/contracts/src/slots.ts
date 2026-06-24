// Contract 3 · Slots
// Named page slots + the registration declaration. Closed v1 set
// (approved, docs/contracts-v1-proposal.md). Extend ADDITIVELY only.
import { z } from 'zod';

/** 32 v1 slots. Order and grouping match the approved proposal. */
export const SLOT_IDS = [
  // global — on every page
  'global.banner-top', 'global.header-start', 'global.header-nav',
  'global.header-actions', 'global.footer', 'global.body-end',
  // home
  'home.hero', 'home.below-hero', 'home.sections', 'home.bottom',
  // catalog — listing/grid
  'catalog.toolbar', 'catalog.sidebar', 'catalog.grid-top', 'catalog.grid-bottom',
  // category
  'category.header', 'category.below-products',
  // product
  'product.gallery', 'product.below-title', 'product.below-price',
  'product.purchase', 'product.below-description', 'product.tabs', 'product.related',
  // cart
  'cart.items-bottom', 'cart.summary', 'cart.below',
  // checkout
  'checkout.top', 'checkout.below',
  // order
  'order.top', 'order.below',
  // search
  'search.results-top', 'search.empty',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

/** Zod enum of slots (for validating feature.json / site.config). */
export const slotIdSchema = z.enum(SLOT_IDS);

/**
 * Declarative slot registration in the feature manifest (feature.json, spec §8):
 * component is the component NAME, resolved in the client repository.
 */
export const slotRegistrationSchema = z.object({
  slot: slotIdSchema,
  component: z.string().min(1),
  order: z.number().int().optional(),
});
export type SlotRegistration = z.infer<typeof slotRegistrationSchema>;

/**
 * Runtime binding of a name to an actual component (used by @vitrine-kit/core
 * in the client's lib/slots.ts). Generic over the component type so the contract
 * doesn't depend on React.
 */
export interface SlotMount<TComponent = unknown> {
  slot: SlotId;
  component: TComponent;
  order?: number;
}
