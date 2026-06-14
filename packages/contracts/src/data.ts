// Контракт 2 · Data
// Нормализованные доменные типы + интерфейсы источников данных.
// Делают фичи переносимыми между Payload и Vendure (§5 спеки).

/**
 * Деньги — целое в минимальных единицах валюты (копейки/центы).
 * 199000 = 1990.00. Решение зафиксировано (см. демо-сид §18.2 спеки).
 */
export type Money = number;

/** ISO 4217, напр. 'RUB', 'USD', 'EUR'. */
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
  /** null/undefined = склад не отслеживается. */
  stock?: number | null;
  /** Опции варианта, напр. { size: 'M', color: 'red' }. */
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
   * Поля, добавленные фичами через blueprint extend() (контракт 5),
   * сюда мапит адаптер. Контракт остаётся стабильным — фичи читают свои ключи.
   */
  extensions?: Record<string, unknown>;
}

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'relevance';

export interface ProductQuery {
  /** slug категории. */
  category?: string;
  search?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  /** Фасеты фильтров: { color: ['red','blue'], size: ['M'] }. */
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
 * Источник каталога. Реализуется адаптерами PayloadCatalog* / VendureCatalog*.
 * Нужен на всех уровнях (каталог и выше).
 */
export interface CatalogSource {
  listProducts(query: ProductQuery): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  search(term: string): Promise<Product[]>;
}

/**
 * Коммерческий бэкенд. Только simple-store / full-store.
 * Реализуется PayloadCommerce* / VendureCommerce*.
 * Полная поверхность корзины зафиксирована в v1 (добавлять методы в интерфейс
 * позже = ломающее изменение для реализаций).
 */
export interface CommerceBackend {
  createCart(): Promise<Cart>;
  getCart(cartId: string): Promise<Cart | null>;
  addItem(cartId: string, variantId: string, qty: number): Promise<Cart>;
  updateItem(cartId: string, lineId: string, qty: number): Promise<Cart>;
  removeItem(cartId: string, lineId: string): Promise<Cart>;
  /** Hosted Stripe Checkout → redirectUrl. */
  startCheckout(cartId: string): Promise<{ redirectUrl: string }>;
  getOrder(id: string): Promise<Order | null>;
}
