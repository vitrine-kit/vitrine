// Registers the Paddle payment provider. The CLI calls this from lib/payments.ts.
import { payments } from '@vitrine-kit/core';
import { paddleProvider } from './provider.js';

export function registerCheckoutPaddleProvider(): void {
  payments.register(paddleProvider);
}
