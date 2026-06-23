// Регистрация слотов фичи catalog. Клиент вызывает это из lib/slots.ts.
// CategoryNav получает categories от хоста слота через пропсы <Slot>.
import { registerSlot } from '@vitrine-kit/core';
import { CategoryNav } from '../../components/catalog/CategoryNav.js';

export function registerCatalogSlots(): void {
  registerSlot({ slot: 'global.header-nav', component: CategoryNav, order: 10 });
}
