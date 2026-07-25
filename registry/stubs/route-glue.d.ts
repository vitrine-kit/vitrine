// Ambient stubs so registry API route glue typechecks in the monorepo without Next/Payload installed.
// Real stack types are verified when the client is instantiated.

declare module 'next/server' {
  export class NextResponse {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static next(): NextResponse;
    static redirect(url: URL | string): NextResponse;
    static rewrite(url: URL | string): NextResponse;
    cookies: {
      set(name: string, value: string, options?: Record<string, unknown>): void;
    };
  }
  export interface NextRequest {
    nextUrl: URL & { clone(): URL & { pathname: string } };
    cookies: { get(name: string): { value: string } | undefined };
  }
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(href: string): void;
    refresh(): void;
  };
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

declare module 'payload' {
  export function getPayload(args: { config: unknown }): Promise<{
    findByID(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>;
    update(args: Record<string, unknown>): Promise<unknown>;
    create(args: Record<string, unknown>): Promise<unknown>;
  }>;
}

declare module '@payload-config' {
  const config: unknown;
  export default config;
}

declare module '@/site.config' {
  import type { SiteConfig } from '@vitrine-kit/contracts';
  export const siteConfig: SiteConfig;
  export default siteConfig;
}

declare module '@/lib/i18n/dictionary' {
  export type MessageKey =
    | 'cart'
    | 'search'
    | 'checkout'
    | 'wishlist'
    | 'orders'
    | 'account'
    | 'continueShopping'
    | 'addToCart'
    | 'thankYou'
    | 'signIn'
    | 'createAccount';
  export function t(key: MessageKey, locale?: string): string;
  export function supportedLocales(): string[];
}

declare module '@/lib/i18n/useChromeLabel' {
  import type { MessageKey } from '@/lib/i18n/dictionary';
  export function useChromeLabel(key: MessageKey, fallbackLocale?: string): string;
  export function chromeLabel(key: MessageKey, locale?: string): string;
}

declare module '@/lib/reviews/types' {
  export interface ProductReview {
    id: string;
    author: string;
    rating: number;
    body: string;
    createdAt: string;
  }
  export function parseReviews(value: unknown): ProductReview[];
}
