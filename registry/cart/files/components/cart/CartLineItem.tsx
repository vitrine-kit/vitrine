// Строка корзины — презентационная.
import type { CartLine } from '@vitrine-kit/contracts';
import { formatMoney } from '../../lib/cart/data.js';

export interface CartLineItemProps {
  line: CartLine;
  currency: string;
}

export function CartLineItem({ line, currency }: CartLineItemProps) {
  return (
    <li className="vt-cart-line flex items-center gap-gutter border-b border-border py-unit">
      {line.image ? (
        <img src={line.image} alt="" className="h-16 w-16 rounded-md object-cover" />
      ) : (
        <div className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
      )}
      <div className="flex-1">
        <p className="text-fg">{line.title}</p>
        <p className="text-muted-fg">
          {line.quantity} × {formatMoney(line.unitPrice, currency)}
        </p>
      </div>
      <p className="text-price">{formatMoney(line.lineTotal, currency)}</p>
    </li>
  );
}
