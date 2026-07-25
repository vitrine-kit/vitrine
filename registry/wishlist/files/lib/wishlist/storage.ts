// localStorage wishlist of product slugs. Pure browser helper — no server.
const KEY = 'vitrine_wishlist';

export function readWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writeWishlist(slugs: string[]): void {
  window.localStorage.setItem(KEY, JSON.stringify([...new Set(slugs)]));
  window.dispatchEvent(new Event('vitrine:wishlist'));
}

export function toggleWishlist(slug: string): string[] {
  const current = readWishlist();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
  writeWishlist(next);
  return next;
}

export function isWishlisted(slug: string): boolean {
  return readWishlist().includes(slug);
}
