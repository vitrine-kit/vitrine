// Реализация контракта CommerceBackend поверх Payload (коллекции carts/orders).
// Денежная арифметика и заказ — из @maks417/core (критлогика); здесь только
// персистентность и вызов Stripe. Stripe SDK импортируется лениво (в startCheckout),
// поэтому модуль грузится и на уровне catalog (без зависимости stripe).
import type { Payload } from 'payload';
import type { Cart, CommerceBackend, Order } from '@maks417/contracts';
import {
  addCartLine,
  buildOrderFromCart,
  cartToStripeLineItems,
  emptyCart,
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

  async startCheckout(cartId: string): Promise<{ redirectUrl: string }> {
    const cart = await this.getCart(cartId);
    if (!cart || cart.lines.length === 0) throw new Error('[vitrine] корзина пуста');

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: cartToStripeLineItems(cart),
      success_url: `${this.baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.baseUrl}/cart`,
      metadata: { cartId: cart.id },
    });
    return { redirectUrl: session.url ?? `${this.baseUrl}/cart` };
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

/** Не используется напрямую — buildOrderFromCart реэкспортируем для webhook-роута. */
export { buildOrderFromCart };
