import { registerSlot } from '@vitrine-kit/core';
import { CatalogToolbar } from '../../components/filters/CatalogToolbar.js';

export function registerFiltersSlots(): void {
  registerSlot({ slot: 'catalog.toolbar', component: CatalogToolbar, order: 10 });
}
