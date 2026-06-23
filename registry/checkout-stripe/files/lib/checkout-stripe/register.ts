// Регистрация платёжного провайдера Stripe. CLI зовёт это из lib/payments.ts.
import { payments } from '@vitrine-kit/core';
import { stripeProvider } from './provider.js';

export function registerCheckoutStripeProvider(): void {
  payments.register(stripeProvider);
}
