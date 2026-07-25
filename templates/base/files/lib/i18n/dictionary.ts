// Minimal chrome dictionary (English). The `i18n` feature overwrites this file
// with multi-locale dictionaries when installed.
export type MessageKey =
  | 'cart'
  | 'search'
  | 'checkout'
  | 'wishlist'
  | 'orders'
  | 'account'
  | 'continueShopping'
  | 'addToCart'
  | 'thankYou'
  | 'signIn'
  | 'createAccount';

const en: Record<MessageKey, string> = {
  cart: 'Cart',
  search: 'Search',
  checkout: 'Checkout',
  wishlist: 'Wishlist',
  orders: 'Orders',
  account: 'Account',
  continueShopping: 'Continue shopping',
  addToCart: 'Add to cart',
  thankYou: 'Thank you for your order',
  signIn: 'Sign in',
  createAccount: 'Create account',
};

export function t(key: MessageKey, _locale = 'en'): string {
  return en[key] ?? key;
}

export function supportedLocales(): string[] {
  return ['en'];
}
