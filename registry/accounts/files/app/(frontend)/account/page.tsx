import type { Metadata } from 'next';
import { getCustomer } from '@/lib/accounts/session';
import { LogoutButton } from '@/components/accounts/LogoutButton';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const customer = await getCustomer();

  if (customer) {
    return (
      <div className="flex max-w-md flex-col gap-section">
        <header className="flex flex-col gap-unit">
          <h1 className="font-heading text-fg">Your account</h1>
          <p className="text-muted-fg">
            Signed in as <span className="text-fg">{customer.email}</span>
            {customer.name ? ` (${customer.name})` : ''}
          </p>
        </header>
        <div className="flex flex-col gap-gutter">
          <a
            href="/account/orders"
            className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          >
            View orders
          </a>
          <LogoutButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Account</h1>
        <p className="text-muted-fg">
          Sign in to see your orders, or look them up with the email used at checkout.
        </p>
      </header>

      <div className="flex flex-wrap gap-gutter">
        <a
          href="/account/login"
          className="rounded-md bg-primary px-gutter py-unit text-primary-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Sign in
        </a>
        <a
          href="/account/register"
          className="rounded-md border border-input px-gutter py-unit text-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Create account
        </a>
      </div>

      <section className="flex flex-col gap-gutter border-t border-border pt-section">
        <h2 className="font-heading text-fg">Guest order lookup</h2>
        <p className="text-muted-fg text-sm">
          Enter the email used at checkout. We show matching paid orders from this store.
        </p>
        <form action="/account/orders" method="get" className="flex flex-col gap-gutter">
          <label className="flex flex-col gap-unit text-sm">
            <span className="text-fg">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded-md border border-input px-gutter py-unit text-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          >
            Look up orders
          </button>
        </form>
      </section>
    </div>
  );
}
