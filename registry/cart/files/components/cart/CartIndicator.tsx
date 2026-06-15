// Ссылка на корзину в шапке (слот global.header-actions). Презентационная.
export function CartIndicator() {
  return (
    <a
      href="/cart"
      className="vt-cart-indicator text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      Корзина
    </a>
  );
}
