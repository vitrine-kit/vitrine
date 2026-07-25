import { registerSlot } from '@vitrine-kit/core';
import { LocaleSwitcher } from '../../components/i18n/LocaleSwitcher.js';

export function registerI18nSlots(): void {
  registerSlot({ slot: 'global.header-actions', component: LocaleSwitcher, order: 30 });
}
