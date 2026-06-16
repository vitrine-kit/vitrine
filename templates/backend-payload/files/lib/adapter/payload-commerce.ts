// Реализация контракта CommerceBackend поверх Payload (коллекции carts/orders).
// Денежная арифметика и заказ — из @maks417/core (критлогика); здесь только
// персистентность. Создание оплаты делегируется активному платёжному провайдеру
// (payments.resolve по site.config), поэтому модуль не тащит ни одного платёжного
// SDK и грузится на любом уровне (включая catalog).
import type { Payload } from 'payload';
import type { Cart, CommerceBackend, Order, SiteConfig } from '@maks417/contracts';
import {
  addCartLine,
  emptyCart,
  payments,
  recalcCart,
  removeCartLine,
  setCartLineQty,
} from '@maks417/core';
import type { ProductDoc, VariantDoc } from './payload-types.js';

interface CartDoc {
  id: string | number;
  lines?: Cart['lines'];
  currency?: string;
  subtotal?: number;
  discountTotal?: number;
  total?: number;
}

export class PayloadCommerceBackend implements CommerceBackend {
  constructor(
    private readonly payload: Payload,
    private readonly currency: string,
    private readonly baseUrl: string,
    private readonly siteConfig: SiteConfig,
  ) {}

  private toCart(doc: CartDoc): Cart {
    return {
      id: String(doc.id),
      lines: doc.lines ?? [],
      currency: doc.currency ?? this.currency,
      subtotal: doc.subtotal ?? 0,
      discountTotal: doc.discountTotal,
      total: doc.total ?? 0,
    };
  }

  private async persist(cart: Cart): Promise<Cart> {
    await this.payload.update({
      collection: 'carts',
      id: cart.id,
      data: { lines: cart.lines, subtotal: cart.subtotal, discountTotal: cart.discountTotal, total: cart.total },
    });
    return cart;
  }

  async createCart(): Promise<Cart> {
    const doc = await this.payload.create({
      collection: 'carts',
      data: { lines: [], currency: this.currency, subtotal: 0, total: 0, status: 'active' },
    });
    return { ...emptyCart('', this.currency), id: String(doc.id) };
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const doc = await this.payload.findByID({ collection: 'carts', id: cartId }).catch(() => null);
    return doc ? this.toCart(doc as unknown as CartDoc) : null;
  }

  async addItem(cartId: string, variantId: string, qty: number): Promise<Cart> {
    const cart = (await this.getCart(cartId)) ?? emptyCart(cartId, this.currency);
    const variant = (await this.payload.findByID({
      collection: 'variants',
      id: variantId,
      depth: 1,
    })) as unknown as VariantDoc;
    const product = variant.product && typeof variant.product === 'object' ? (variant.product as ProductDoc) : null;
    const firstImage =
      product?.images && product.images.length > 0 && typeof product.images[0] === 'object'
        ? ((product.images[0] as { url?: string }).url ?? undefined)
        : undefined;

    const next = addCartLine(cart, {
      id: `${variantId}-${Date.now()}`,
      variantId: String(variant.id),
      productId: product ? String(product.id) : '',
      title: product?.title ?? variant.sku,
      unitPrice: variant.price,
      quantity: qty,
      image: firstImage,
    });
    return this.persist(next);
  }

  async updateItem(cartId: string, lineId: string, qty: number): Promise<Cart> {
    const cart = await this.getCart(cartId);
    if (!cart) throw new Error('[vitrine] корзина не найдена');
    return this.persist(setCartLineQty(cart, lineId, qty));
  }

  async removeItem(cartId: string, lineId: string): Promise<Cart> {
    const cart = await this.getCart(cartId);
    if (!cart) throw new Error('[vitrine] корзина не найдена');
    return this.persist(removeCartLine(cart, lineId));
  }

  /** Перепроверяет цены строк по актуальным вариантам (анти-stale). Источник цены —
   *  БД, а не величина, сохранённая в корзине при добавлении. */
  private async reprice(cart: Cart): Promise<Cart> {
    const lines = await Promise.all(
      cart.lines.map(async (l) => {
        const variant = (await this.payload
          .findByID({ collection: 'variants', id: l.variantId })
          .catch(() => null)) as unknown as VariantDoc | null;
        return variant && typeof variant.price === 'number' ? { ...l, unitPrice: variant.price } : l;
      }),
    );
    return this.persist(recalcCart({ ...cart, lines })); // recalc пересчитает lineTotal/итоги
  }

  async startCheckout(cartId: string): Promise<{ redirectUrl: string }> {
    const current = await this.getCart(cartId);
    if (!current || current.lines.length === 0) throw new Error('[vitrine] корзина пуста');
    const cart = await this.reprice(current);
    // Активный провайдер (Stripe/Paddle/YooKassa) резолвится по integrations.payments;
    // его фича checkout-<provider> зарегистрировала его в реестре через lib/payments.ts.
    return payments.resolve(this.siteConfig).createCheckout({ cart, baseUrl: this.baseUrl });
  }

  async getOrder(id: string): Promise<Order | null> {
    const doc = await this.payload.findByID({ collection: 'orders', id }).catch(() => null);
    if (!doc) return null;
    const o = doc as unknown as {
      id: string | number;
      status: Order['status'];
      lines?: Order['lines'];
      currency?: string;
      subtotal?: number;
      discountTotal?: number;
      total?: number;
      email?: string;
      createdAt?: string;
    };
    return {
      id: String(o.id),
      status: o.status,
      lines: o.lines ?? [],
      currency: o.currency ?? this.currency,
      subtotal: o.subtotal ?? 0,
      discountTotal: o.discountTotal,
      total: o.total ?? 0,
      email: o.email,
      createdAt: o.createdAt ?? new Date().toISOString(),
    };
  }
}
