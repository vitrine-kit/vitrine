// CommerceBackend contract implementation on top of Vendure (active order + session
// token). cartId == the Vendure session auth-token. Money totals come from Vendure;
// normalization lives in map.ts. Payment — Vendure's Stripe plugin (startCheckout moves
// the order to ArrangingPayment). Next glue, validated against a running Vendure.
import type { Cart, CommerceBackend, Order } from '@vitrine-kit/contracts';
import { shopQuery } from './graphql.js';
import { mapVendureOrder, mapVendureOrderToCart } from './map.js';
import type { VOrder } from './vendure-types.js';

const ORDER_FIELDS = `
  id code state currencyCode subTotalWithTax totalWithTax createdAt
  customer { emailAddress }
  lines {
    id quantity unitPriceWithTax linePriceWithTax
    featuredAsset { preview }
    productVariant { id sku name product { id slug } }
  }
`;

const emptyCart = (id: string): Cart => ({ id, lines: [], currency: 'USD', subtotal: 0, total: 0 });

export class VendureCommerceBackend implements CommerceBackend {
  constructor(private readonly baseUrl: string) {}

  async createCart(): Promise<Cart> {
    // Vendure issues a session token on any request; the active order is created on addItem.
    const { token } = await shopQuery(`{ activeChannel { id } }`);
    return emptyCart(token ?? '');
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const { data } = await shopQuery<{ activeOrder: VOrder | null }>(`{ activeOrder { ${ORDER_FIELDS} } }`, {}, cartId);
    return data.activeOrder ? mapVendureOrderToCart(data.activeOrder) : emptyCart(cartId);
  }

  async addItem(cartId: string, variantId: string, qty: number): Promise<Cart> {
    const { data } = await shopQuery<{ addItemToOrder: VOrder }>(
      `mutation ($id: ID!, $q: Int!) { addItemToOrder(productVariantId: $id, quantity: $q) { ...on Order { ${ORDER_FIELDS} } } }`,
      { id: variantId, q: qty },
      cartId,
    );
    return mapVendureOrderToCart(data.addItemToOrder);
  }

  async updateItem(cartId: string, lineId: string, qty: number): Promise<Cart> {
    const { data } = await shopQuery<{ adjustOrderLine: VOrder }>(
      `mutation ($id: ID!, $q: Int!) { adjustOrderLine(orderLineId: $id, quantity: $q) { ...on Order { ${ORDER_FIELDS} } } }`,
      { id: lineId, q: qty },
      cartId,
    );
    return mapVendureOrderToCart(data.adjustOrderLine);
  }

  async removeItem(cartId: string, lineId: string): Promise<Cart> {
    const { data } = await shopQuery<{ removeOrderLine: VOrder }>(
      `mutation ($id: ID!) { removeOrderLine(orderLineId: $id) { ...on Order { ${ORDER_FIELDS} } } }`,
      { id: lineId },
      cartId,
    );
    return mapVendureOrderToCart(data.removeOrderLine);
  }

  async startCheckout(cartId: string): Promise<{ redirectUrl: string }> {
    // Transition to payment; Vendure's Stripe plugin creates a PaymentIntent on the payment page.
    await shopQuery(`mutation { transitionOrderToState(state: "ArrangingPayment") { ...on Order { id } } }`, {}, cartId);
    return { redirectUrl: `${this.baseUrl}/checkout/payment` };
  }

  async getOrder(id: string): Promise<Order | null> {
    const { data } = await shopQuery<{ orderByCode: VOrder | null }>(
      `query ($code: String!) { orderByCode(code: $code) { ${ORDER_FIELDS} } }`,
      { code: id },
    );
    return data.orderByCode ? mapVendureOrder(data.orderByCode) : null;
  }
}
