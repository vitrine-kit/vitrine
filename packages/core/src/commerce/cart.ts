// Корзинная арифметика (контракт Cart). Критическая денежная логика живёт в
// пакете, не в copy-in реестре: баг в подсчёте суммы = инцидент у всех клиентов.
// Чистые функции (без I/O) — реализация CommerceBackend в шаблоне делегирует им,
// храня только персистентность. Деньги — целое в минимальных единицах (копейки).
import type { Cart, CartLine, CurrencyCode, Money } from '@vitrine-kit/contracts';

export function computeLineTotal(unitPrice: Money, quantity: number): Money {
  return unitPrice * quantity;
}

/** Пустая корзина. */
export function emptyCart(id: string, currency: CurrencyCode): Cart {
  return { id, lines: [], currency, subtotal: 0, total: 0 };
}

/** Пересчитывает lineTotal каждой строки и итоги (subtotal/total с учётом скидки). */
export function recalcCart(cart: Cart): Cart {
  const lines = cart.lines.map((l) => ({ ...l, lineTotal: computeLineTotal(l.unitPrice, l.quantity) }));
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discountTotal = cart.discountTotal ?? 0;
  const total = Math.max(0, subtotal - discountTotal);
  return { ...cart, lines, subtotal, total };
}

export interface NewLineInput {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  unitPrice: Money;
  quantity: number;
  image?: string;
}

/** Добавляет строку; если вариант уже в корзине — увеличивает количество. */
export function addCartLine(cart: Cart, input: NewLineInput): Cart {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error(`[vitrine] недопустимое количество строки: ${input.quantity} (нужно целое > 0)`);
  }
  const exists = cart.lines.some((l) => l.variantId === input.variantId);
  const lines: CartLine[] = exists
    ? cart.lines.map((l) =>
        l.variantId === input.variantId ? { ...l, quantity: l.quantity + input.quantity } : l,
      )
    : [
        ...cart.lines,
        {
          id: input.id,
          variantId: input.variantId,
          productId: input.productId,
          title: input.title,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          lineTotal: computeLineTotal(input.unitPrice, input.quantity),
          image: input.image,
        },
      ];
  return recalcCart({ ...cart, lines });
}

/** Меняет количество строки; quantity ≤ 0 удаляет строку. */
export function setCartLineQty(cart: Cart, lineId: string, quantity: number): Cart {
  if (!Number.isInteger(quantity)) {
    throw new Error(`[vitrine] недопустимое количество: ${quantity} (нужно целое)`);
  }
  if (quantity <= 0) return removeCartLine(cart, lineId);
  return recalcCart({
    ...cart,
    lines: cart.lines.map((l) => (l.id === lineId ? { ...l, quantity } : l)),
  });
}

export function removeCartLine(cart: Cart, lineId: string): Cart {
  return recalcCart({ ...cart, lines: cart.lines.filter((l) => l.id !== lineId) });
}

/** Суммарное число единиц в корзине (для индикатора в шапке). */
export function cartItemCount(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.quantity, 0);
}
