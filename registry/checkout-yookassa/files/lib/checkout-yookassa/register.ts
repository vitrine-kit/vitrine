// Регистрация платёжного провайдера ЮKassa. CLI зовёт это из lib/payments.ts.
import { payments } from '@maks417/core';
import { yookassaProvider } from './provider.js';

export function registerCheckoutYookassaProvider(): void {
  payments.register(yookassaProvider);
}
