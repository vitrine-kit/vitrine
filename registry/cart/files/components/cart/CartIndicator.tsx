// Header cart link (global.header-actions slot). Presentational.
export function CartIndicator() {
  return (
    <a
      href="/cart"
      className="vt-cart-indicator text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      Cart
    </a>
  );
}
