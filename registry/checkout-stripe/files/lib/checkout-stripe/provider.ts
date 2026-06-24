// PaymentProvider over Stripe Hosted Checkout. The Stripe SDK lives here (in the feature),
// not in the core: createCheckout creates a session, verifyWebhook verifies the signature and
// normalizes the event into a NormalizedPaymentEvent. Mapping the cart into Stripe line items
// (price_data — dynamic prices, unit_amount in minor units) also lives here.
import type { Cart } from '@vitrine-kit/contracts';
import type {
  CreateCheckoutArgs,
  NormalizedPaymentEvent,
  PaymentProvider,
  PaymentWebhookRequest,
} from '@vitrine-kit/core';

interface StripeLineItem {
  quantity: number;
  price_data: { currency: string; unit_amount: number; product_data: { name: string } };
}

function cartToStripeLineItems(cart: Cart): StripeLineItem[] {
  return cart.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: cart.currency.toLowerCase(),
      unit_amount: l.unitPrice,
      product_data: { name: l.title },
    },
  }));
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  async createCheckout(args: CreateCheckoutArgs): Promise<{ redirectUrl: string }> {
    const { cart, baseUrl, successPath = '/order/success', cancelPath = '/cart' } = args;
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: cartToStripeLineItems(cart),
      success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: { cartId: cart.id },
    });
    return { redirectUrl: session.url ?? `${baseUrl}${cancelPath}` };
  },

  async verifyWebhook(req: PaymentWebhookRequest): Promise<NormalizedPaymentEvent> {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    const signature = req.headers['stripe-signature'] ?? '';
    // Throws on an invalid signature — handlePaymentWebhook surfaces it as a 400.
    const event = stripe.webhooks.constructEvent(req.rawBody, signature, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id?: string;
        metadata?: { cartId?: string };
        customer_details?: { email?: string };
      };
      return {
        kind: 'checkout_completed',
        cartId: session.metadata?.cartId,
        providerRef: session.id,
        email: session.customer_details?.email,
        raw: event,
      };
    }
    if (event.type === 'payment_intent.payment_failed') {
      return { kind: 'payment_failed', raw: event };
    }
    return { kind: 'unknown', raw: event };
  },
};
