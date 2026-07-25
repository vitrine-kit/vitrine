import { registerSlot } from '@vitrine-kit/core';
import { AccountLink } from '../../components/accounts/AccountLink.js';

export function registerAccountsSlots(): void {
  registerSlot({ slot: 'global.header-actions', component: AccountLink, order: 25 });
}
