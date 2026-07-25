// Multi-locale chrome dictionary. Overwrites the base English stub when `i18n` is installed.
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

const ru: Record<MessageKey, string> = {
  cart: 'Корзина',
  search: 'Поиск',
  checkout: 'Оформить',
  wishlist: 'Избранное',
  orders: 'Заказы',
  account: 'Аккаунт',
  continueShopping: 'Продолжить покупки',
  addToCart: 'В корзину',
  thankYou: 'Спасибо за заказ',
  signIn: 'Войти',
  createAccount: 'Создать аккаунт',
};

const dictionaries: Record<string, Record<MessageKey, string>> = { en, ru };

export function t(key: MessageKey, locale = 'en'): string {
  const dict = dictionaries[locale] ?? en;
  return dict[key] ?? en[key] ?? key;
}

export function supportedLocales(): string[] {
  return Object.keys(dictionaries);
}
