// Реестр платёжных провайдеров — зеркало adapter/resolver.ts. Фичи
// checkout-<provider> регистрируют свой провайдер (через lib/payments.ts,
// генерируемый CLI); startCheckout резолвит активный по integrations.payments.
import type { SiteConfig } from '@maks417/contracts';
import type { PaymentProvider, PaymentProviderName } from './provider.js';

export interface PaymentRegistry {
  register(provider: PaymentProvider): void;
  /** Активный провайдер по site.config.integrations.payments. */
  resolve(config: SiteConfig): PaymentProvider;
  get(name: PaymentProviderName): PaymentProvider | undefined;
  clear(): void;
}

export function createPaymentRegistry(): PaymentRegistry {
  const providers = new Map<PaymentProviderName, PaymentProvider>();

  function register(provider: PaymentProvider): void {
    providers.set(provider.name, provider);
  }

  function resolve(config: SiteConfig): PaymentProvider {
    const name = config.integrations.payments;
    if (!name) {
      throw new Error(
        '[vitrine] integrations.payments не задан в site.config — установите фичу checkout-<provider>',
      );
    }
    const provider = providers.get(name);
    if (!provider) {
      throw new Error(`[vitrine] платёжный провайдер "${name}" не зарегистрирован`);
    }
    return provider;
  }

  function get(name: PaymentProviderName): PaymentProvider | undefined {
    return providers.get(name);
  }

  function clear(): void {
    providers.clear();
  }

  return { register, resolve, get, clear };
}

/** Глобальный реестр провайдеров по умолчанию. */
export const payments: PaymentRegistry = createPaymentRegistry();
