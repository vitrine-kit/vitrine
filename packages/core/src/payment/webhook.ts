// Провайдер-нейтральный диспетчер вебхуков. verify инъектируется провайдером
// (verifyWebhook), поэтому ядро не тащит ни одного платёжного SDK. Бросает при
// невалидной подписи — роут отдаёт 400. Заменяет прежний handleStripeWebhook.
import type { NormalizedPaymentEvent, PaymentProvider, PaymentWebhookRequest } from './provider.js';

export interface PaymentWebhookHandlers {
  onCheckoutCompleted?(event: NormalizedPaymentEvent): void | Promise<void>;
  onPaymentFailed?(event: NormalizedPaymentEvent): void | Promise<void>;
}

export interface PaymentWebhookResult {
  received: true;
  kind: NormalizedPaymentEvent['kind'];
  /** Был ли зарегистрирован обработчик для этого вида события. */
  handled: boolean;
}

export async function handlePaymentWebhook(args: {
  provider: PaymentProvider;
  req: PaymentWebhookRequest;
  handlers?: PaymentWebhookHandlers;
}): Promise<PaymentWebhookResult> {
  // Бросает при невалидной подписи/подлинности — наружу отдаём 400.
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
