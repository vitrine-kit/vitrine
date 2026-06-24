// Registers the catalog feature's slots. The client calls this from lib/slots.ts.
// CategoryNav receives categories from the slot host via <Slot> props.
import { registerSlot } from '@vitrine-kit/core';
import { CategoryNav } from '../../components/catalog/CategoryNav.js';

export function registerCatalogSlots(): void {
  registerSlot({ slot: 'global.header-nav', component: CategoryNav, order: 10 });
}
