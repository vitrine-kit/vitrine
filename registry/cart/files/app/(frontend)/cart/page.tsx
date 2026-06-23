// Страница корзины. Cart-id хранится в cookie; данные — через контракт
// CommerceBackend (адаптер бэкенда в lib/adapter). Не типизируется в монорепо
// (Next-glue), проверяется при инстанцировании клиента.
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
      <h1 className="font-heading text-fg">Корзина</h1>
      <CartView cart={cart ?? emptyCart('', siteConfig.i18n.currency)} />
    </section>
  );
}
