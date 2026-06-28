// Ambient stubs so registry API route glue typechecks in the monorepo without Next/Payload installed.
// Real stack types are verified when the client is instantiated.

declare module 'next/server' {
  export class NextResponse {
    static json(body: unknown, init?: ResponseInit): NextResponse;
  }
}

declare module 'next/headers' {
  interface CookieStore {
    get(name: string): { value: string } | undefined;
    set(name: string, value: string, options?: Record<string, unknown>): void;
  }
  export function cookies(): Promise<CookieStore>;
}

declare module '@/lib/adapter' {
  import type { CatalogSource, CommerceBackend } from '@vitrine-kit/contracts';
  export function getCatalogSource(): Promise<CatalogSource>;
  export function getCommerceBackend(): Promise<CommerceBackend>;
}

declare module '@/lib/checkout/fulfill' {
  import type { NormalizedPaymentEvent, PaymentProviderName } from '@vitrine-kit/core';
  export function fulfillOrderFromEvent(
    event: NormalizedPaymentEvent,
    providerName: PaymentProviderName,
  ): Promise<void>;
}

declare module '@/lib/checkout-stripe/provider' {
  import type { PaymentProvider } from '@vitrine-kit/core';
  export const stripeProvider: PaymentProvider;
}

declare module '@/lib/checkout-paddle/provider' {
  import type { PaymentProvider } from '@vitrine-kit/core';
  export const paddleProvider: PaymentProvider;
}

declare module '@/lib/checkout-yookassa/provider' {
  import type { PaymentProvider } from '@vitrine-kit/core';
  export const yookassaProvider: PaymentProvider;
}
