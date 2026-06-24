// The payment-provider contract (framework- and SDK-agnostic). Implementations
// (Stripe/Paddle/YooKassa) live in the checkout-<provider> registry features and bring their
// own SDK; the core only describes the shape. startCheckout returns a redirectUrl (like
// CommerceBackend), verifyWebhook verifies the signature and normalizes the event.
import type { Cart } from '@vitrine-kit/contracts';

/** Matches integrations.payments in site.config (contract 4). */
export type PaymentProviderName = 'stripe' | 'paddle' | 'yookassa';

export interface CreateCheckoutArgs {
  cart: Cart;
  /** The storefront base URL; success/cancel are built relative to it. */
  baseUrl: string;
  /** Defaults to '/order/success'. */
  successPath?: string;
  /** Defaults to '/cart'. */
  cancelPath?: string;
}

export interface PaymentWebhookRequest {
  rawBody: string;
  headers: Record<string, string | null>;
}

/** A normalized provider event — the common language for webhook routes. */
export interface NormalizedPaymentEvent {
  kind: 'checkout_completed' | 'payment_failed' | 'unknown';
  /** From the provider's metadata/custom_data/label. */
  cartId?: string;
  /** The provider's unique payment reference — the idempotency key. */
  providerRef?: string;
  email?: string;
  /** The raw provider object (in case the route needs extra fields). */
  raw: unknown;
}

export interface PaymentProvider {
  name: PaymentProviderName;
  /** Creates a hosted checkout at the provider → redirect URL. */
  createCheckout(args: CreateCheckoutArgs): Promise<{ redirectUrl: string }>;
  /** Verifies the signature/authenticity and normalizes the event. Throws if invalid. */
  verifyWebhook(req: PaymentWebhookRequest): Promise<NormalizedPaymentEvent>;
}
