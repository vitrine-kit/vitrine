import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import { formatMoney } from '@/lib/cart/data';
import { getCustomer } from '@/lib/accounts/session';
import { LogoutButton } from '@/components/accounts/LogoutButton';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function AccountOrdersPage({ searchParams }: PageProps) {
  const customer = await getCustomer();
  const { email: raw } = await searchParams;
  const guestEmail = raw?.trim().toLowerCase() ?? '';
  const email = customer?.email?.trim().toLowerCase() || guestEmail;

  if (!email || !email.includes('@')) {
    return (
      <div className="flex flex-col gap-gutter">
        <h1 className="font-heading text-fg">Your orders</h1>
        <p className="text-muted-fg">Sign in or provide a valid email on the account page.</p>
        <a href="/account" className="w-fit text-fg underline underline-offset-2">
          Back
        </a>
      </div>
    );
  }

  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'orders',
    where: { email: { equals: email } },
    sort: '-createdAt',
    limit: 50,
    overrideAccess: true,
  });

  const orders = res.docs as Array<{
    id: string | number;
    status?: string;
    total?: number;
    currency?: string;
    createdAt?: string;
    paymentRef?: string;
  }>;

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Your orders</h1>
        <p className="text-muted-fg">
          Showing orders for <span className="text-fg">{email}</span>
          {customer ? ' (signed in)' : ' (guest lookup)'}
        </p>
      </header>
      {orders.length === 0 ? (
        <p className="text-muted-fg">No orders found for that email.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-gutter">
          {orders.map((o) => (
            <li key={String(o.id)} className="flex flex-col gap-unit border-b border-border py-unit">
              <p className="text-fg">
                Order #{String(o.id)} — {o.status ?? 'unknown'}
              </p>
              <p className="text-muted-fg">
                {typeof o.total === 'number' ? formatMoney(o.total, o.currency ?? 'USD') : '—'}
                {o.createdAt ? ` · ${new Date(o.createdAt).toLocaleString()}` : ''}
              </p>
              {o.paymentRef ? (
                <p className="text-sm text-muted-fg">Ref: {o.paymentRef}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-gutter">
        <a href="/account" className="w-fit text-fg underline underline-offset-2">
          Account
        </a>
        {customer ? <LogoutButton /> : null}
      </div>
    </div>
  );
}
