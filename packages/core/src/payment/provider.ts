// Контракт платёжного провайдера (фреймворк- и SDK-агностичный). Реализации
// (Stripe/Paddle/YooKassa) живут в registry-фичах checkout-<provider> и тащат свой
// SDK; ядро лишь описывает форму. startCheckout отдаёт redirectUrl (как и
// CommerceBackend), verifyWebhook верифицирует подпись и нормализует событие.
import type { Cart } from '@maks417/contracts';

/** Совпадает с integrations.payments в site.config (контракт 4). */
export type PaymentProviderName = 'stripe' | 'paddle' | 'yookassa';

export interface CreateCheckoutArgs {
  cart: Cart;
  /** Базовый URL витрины; success/cancel строятся относительно него. */
  baseUrl: string;
  /** По умолчанию '/order/success'. */
  successPath?: string;
  /** По умолчанию '/cart'. */
  cancelPath?: string;
}

export interface PaymentWebhookRequest {
  rawBody: string;
  headers: Record<string, string | null>;
}

/** Нормализованное событие провайдера — общий язык для роутов вебхуков. */
export interface NormalizedPaymentEvent {
  kind: 'checkout_completed' | 'payment_failed' | 'unknown';
  /** Из metadata/custom_data/label провайдера. */
  cartId?: string;
  /** Уникальный референс платежа провайдера — ключ идемпотентности. */
  providerRef?: string;
  email?: string;
  /** Исходный объект провайдера (на случай, если роуту нужны доп. поля). */
  raw: unknown;
}

export interface PaymentProvider {
  name: PaymentProviderName;
  /** Создаёт hosted-checkout у провайдера → URL для редиректа. */
  createCheckout(args: CreateCheckoutArgs): Promise<{ redirectUrl: string }>;
  /** Верифицирует подпись/подлинность и нормализует событие. Бросает при невалидном. */
  verifyWebhook(req: PaymentWebhookRequest): Promise<NormalizedPaymentEvent>;
}
