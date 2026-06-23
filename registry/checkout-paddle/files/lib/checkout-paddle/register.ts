// Регистрация платёжного провайдера Paddle. CLI зовёт это из lib/payments.ts.
import { payments } from '@vitrine-kit/core';
import { paddleProvider } from './provider.js';

export function registerCheckoutPaddleProvider(): void {
  payments.register(paddleProvider);
}
