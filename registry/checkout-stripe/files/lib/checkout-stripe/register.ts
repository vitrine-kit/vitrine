// Registers the Stripe payment provider. The CLI calls this from lib/payments.ts.
import { payments } from '@vitrine-kit/core';
import { stripeProvider } from './provider.js';

export function registerCheckoutStripeProvider(): void {
  payments.register(stripeProvider);
}
