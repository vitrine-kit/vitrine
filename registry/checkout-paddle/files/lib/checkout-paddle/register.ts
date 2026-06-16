// Регистрация платёжного провайдера Paddle. CLI зовёт это из lib/payments.ts.
import { payments } from '@maks417/core';
import { paddleProvider } from './provider.js';

export function registerCheckoutPaddleProvider(): void {
  payments.register(paddleProvider);
}
