// Cart page. The cart id is stored in a cookie; data comes via the CommerceBackend
// contract (the backend adapter in lib/adapter). Not typechecked in the monorepo
// (Next glue), verified when the client is instantiated.
import { cookies } from 'next/headers';
import { emptyCart } from '@vitrine-kit/core';
import { getCommerceBackend } from '@/lib/adapter';
import { CartView } from '@/components/cart/CartView';
import { siteConfig } from '@/site.config';

export default async function CartPage() {
  const cartId = (await cookies()).get('vitrine_cart')?.value;
  const commerce = await getCommerceBackend();
  const cart = cartId ? await commerce.getCart(cartId) : null;

  return (
    <section className="flex flex-col gap-section">
      <h1 className="font-heading text-fg">Cart</h1>
      <CartView cart={cart ?? emptyCart('', siteConfig.i18n.currency)} />
    </section>
  );
}
