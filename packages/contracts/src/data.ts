// Contract 2 · Data
// Normalized domain types + data-source interfaces.
// They make features portable between Payload and Vendure (spec §5).

/**
 * Money — an integer in the currency's minor units (cents).
 * 199000 = 1990.00. Decision is fixed (see the demo seed, spec §18.2).
 */
export type Money = number;

/** ISO 4217, e.g. 'USD', 'EUR', 'GBP'. */
export type CurrencyCode = string;

export interface Category {
  id: string;
  slug: string;
  title: string;
  parentId?: string | null;
  description?: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface Variant {
  id: string;
  sku: string;
  title?: string;
  price: Money;
  currency: CurrencyCode;
  /** null/undefined = stock not tracked. */
  stock?: number | null;
  /** Variant options, e.g. { size: 'M', color: 'red' }. */
  options?: Record<string, string>;
}

export interface Seo {
  title?: string;
  description?: string;
  image?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description?: string;
  categoryIds: string[];
  images: ProductImage[];
  variants: Variant[];
  priceRange?: { min: Money; max: Money; currency: CurrencyCode };
  seo?: Seo;
  /**
   * Fields added by features via blueprint extend() (contract 5),
   * mapped here by the adapter. The contract stays stable — features read their own keys.
   */
  extensions?: Record<string, unknown>;
}

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'relevance';

export interface ProductQuery {
  /** Category slug. */
  category?: string;
  search?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  /** Filter facets: { color: ['red','blue'], size: ['M'] }. */
  filters?: Record<string, string[]>;
}

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  image?: string;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  currency: CurrencyCode;
  subtotal: Money;
  discountTotal?: Money;
  total: Money;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';

export interface OrderLine {
  variantId: string;
  productId: string;
  title: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface Order {
  id: string;
  number?: string;
  status: OrderStatus;
  lines: OrderLine[];
  currency: CurrencyCode;
  subtotal: Money;
  discountTotal?: Money;
  total: Money;
  email?: string;
  /** ISO-8601. */
  createdAt: string;
}

/**
 * Catalog source. Implemented by the PayloadCatalog* / VendureCatalog* adapters.
 * Needed at every tier (catalog and above).
 */
export interface CatalogSource {
  listProducts(query: ProductQuery): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  search(term: string): Promise<Product[]>;
}

/**
 * Commerce backend. Only simple-store / full-store.
 * Implemented by PayloadCommerce* / VendureCommerce*.
 * The full cart surface is fixed in v1 (adding methods to the interface
 * later = a breaking change for implementations).
 */
export interface CommerceBackend {
  createCart(): Promise<Cart>;
  getCart(cartId: string): Promise<Cart | null>;
  addItem(cartId: string, variantId: string, qty: number): Promise<Cart>;
  updateItem(cartId: string, lineId: string, qty: number): Promise<Cart>;
  removeItem(cartId: string, lineId: string): Promise<Cart>;
  /** Hosted checkout of the active payment provider → redirectUrl. */
  startCheckout(cartId: string): Promise<{ redirectUrl: string }>;
  getOrder(id: string): Promise<Order | null>;
}
