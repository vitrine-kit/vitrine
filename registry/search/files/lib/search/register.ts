// Registers the search feature's slots. SearchForm sits in the header actions
// (before CartIndicator when cart is installed).
import { registerSlot } from '@vitrine-kit/core';
import { SearchForm } from '../../components/search/SearchForm.js';

export function registerSearchSlots(): void {
  registerSlot({ slot: 'global.header-actions', component: SearchForm, order: 5 });
}
