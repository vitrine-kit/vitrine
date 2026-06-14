// Stripe webhook handler (каркас, наполняется в M8).
// Верификация инъектируется: в проде verify = stripe.webhooks.constructEvent(...)
// (с подписью и секретом); в тестах — мок. Так пакет не тащит Stripe SDK в ядро.

export interface StripeEventLike {
  id?: string;
  type: string;
  data: { object: unknown };
}

/** Верифицирует подпись и парсит событие. Бросает при неверной подписи. */
export type StripeVerifier = (payload: string, signature: string) => StripeEventLike;

export interface StripeWebhookHandlers {
  onCheckoutCompleted?(event: StripeEventLike): void | Promise<void>;
  onPaymentFailed?(event: StripeEventLike): void | Promise<void>;
}

export interface StripeWebhookResult {
  received: true;
  type: string;
  /** Был ли зарегистрирован обработчик для этого типа события. */
  handled: boolean;
}

export async function handleStripeWebhook(args: {
  payload: string;
  signature: string;
  verify: StripeVerifier;
  handlers?: StripeWebhookHandlers;
}): Promise<StripeWebhookResult> {
  // Бросает при неверной подписи — наружу отдаём 400.
  const event = args.verify(args.payload, args.signature);
  const handlers = args.handlers ?? {};
  let handled = false;

  switch (event.type) {
    case 'checkout.session.completed':
      if (handlers.onCheckoutCompleted) {
        await handlers.onCheckoutCompleted(event);
        handled = true;
      }
      break;
    case 'payment_intent.payment_failed':
      if (handlers.onPaymentFailed) {
        await handlers.onPaymentFailed(event);
        handled = true;
      }
      break;
  }

  return { received: true, type: event.type, handled };
}
