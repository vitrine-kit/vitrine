// A provider-neutral webhook dispatcher. verify is injected by the provider
// (verifyWebhook), so the core pulls in no payment SDK. Throws on an
// invalid signature — the route returns 400. Replaces the former handleStripeWebhook.
import type { NormalizedPaymentEvent, PaymentProvider, PaymentWebhookRequest } from './provider.js';

export interface PaymentWebhookHandlers {
  onCheckoutCompleted?(event: NormalizedPaymentEvent): void | Promise<void>;
  onPaymentFailed?(event: NormalizedPaymentEvent): void | Promise<void>;
}

export interface PaymentWebhookResult {
  received: true;
  kind: NormalizedPaymentEvent['kind'];
  /** Whether a handler was registered for this event kind. */
  handled: boolean;
}

export async function handlePaymentWebhook(args: {
  provider: PaymentProvider;
  req: PaymentWebhookRequest;
  handlers?: PaymentWebhookHandlers;
}): Promise<PaymentWebhookResult> {
  // Throws on an invalid signature/authenticity — we surface it as a 400.
  const event = await args.provider.verifyWebhook(args.req);
  const handlers = args.handlers ?? {};
  let handled = false;

  switch (event.kind) {
    case 'checkout_completed':
      if (handlers.onCheckoutCompleted) {
        await handlers.onCheckoutCompleted(event);
        handled = true;
      }
      break;
    case 'payment_failed':
      if (handlers.onPaymentFailed) {
        await handlers.onPaymentFailed(event);
        handled = true;
      }
      break;
  }

  return { received: true, kind: event.kind, handled };
}
