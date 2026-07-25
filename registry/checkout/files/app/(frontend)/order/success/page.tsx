// Post-payment landing page. Stripe/Paddle/YooKassa redirect here after a successful
// hosted checkout (successPath default: /order/success). Order fulfillment happens
// asynchronously via the provider webhook — this page is confirmation UX only.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Slot } from '@vitrine-kit/core/react';
import { siteName } from '@/lib/site';
import { t } from '@/lib/i18n/dictionary';

export const metadata: Metadata = {
  title: 'Order confirmed',
};

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const locale = (await cookies()).get('vitrine_locale')?.value ?? 'en';

  return (
    <div className="vt-order-success flex flex-col gap-section">
      <Slot name="order.top" />
      <section aria-labelledby="order-success-heading" className="flex flex-col gap-gutter">
        <h1 id="order-success-heading" className="font-heading text-3xl text-fg">
          {t('thankYou', locale)}
        </h1>
        <p className="max-w-prose text-muted-fg">
          Your payment was received. {siteName} will email a confirmation when the order is
          recorded{sessionId ? ' (this can take a few seconds while the payment webhook runs)' : ''}.
        </p>
        {sessionId ? (
          <p className="text-sm text-muted-fg">
            Reference: <span className="font-mono text-fg">{sessionId}</span>
          </p>
        ) : null}
        <a
          href="/"
          className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          {t('continueShopping', locale)}
        </a>
      </section>
      <Slot name="order.below" />
    </div>
  );
}
