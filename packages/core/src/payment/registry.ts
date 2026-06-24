// The payment-provider registry — mirrors adapter/resolver.ts. The checkout-<provider>
// features register their provider (via the CLI-generated lib/payments.ts); startCheckout
// resolves the active one by integrations.payments.
import type { SiteConfig } from '@vitrine-kit/contracts';
import type { PaymentProvider, PaymentProviderName } from './provider.js';

export interface PaymentRegistry {
  register(provider: PaymentProvider): void;
  /** The active provider by site.config.integrations.payments. */
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
        '[vitrine] integrations.payments is not set in site.config — install a checkout-<provider> feature',
      );
    }
    const provider = providers.get(name);
    if (!provider) {
      throw new Error(`[vitrine] payment provider "${name}" is not registered`);
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

/** The default global provider registry. */
export const payments: PaymentRegistry = createPaymentRegistry();
