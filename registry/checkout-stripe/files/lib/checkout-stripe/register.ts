// Регистрация платёжного провайдера Stripe. CLI зовёт это из lib/payments.ts.
import { payments } from '@maks417/core';
import { stripeProvider } from './provider.js';

export function registerCheckoutStripeProvider(): void {
  payments.register(stripeProvider);
}
