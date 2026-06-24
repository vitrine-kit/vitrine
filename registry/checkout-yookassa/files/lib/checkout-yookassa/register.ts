// Registers the YooKassa payment provider. The CLI calls this from lib/payments.ts.
import { payments } from '@vitrine-kit/core';
import { yookassaProvider } from './provider.js';

export function registerCheckoutYookassaProvider(): void {
  payments.register(yookassaProvider);
}
