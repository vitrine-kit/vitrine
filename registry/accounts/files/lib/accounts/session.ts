// Server helpers for the storefront customer session (Payload auth collection `customers`).
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';

export type CustomerUser = {
  id: string | number;
  email?: string | null;
  name?: string | null;
  collection?: string;
};

export async function getCustomer(): Promise<CustomerUser | null> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user || (user as CustomerUser).collection !== 'customers') return null;
  return user as CustomerUser;
}
