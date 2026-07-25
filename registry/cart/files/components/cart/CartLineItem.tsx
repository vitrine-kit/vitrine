// Cart line item — client controls for quantity and remove (PATCH/DELETE /api/cart).
'use client';
import { useState } from 'react';
import type { CartLine } from '@vitrine-kit/contracts';
import { formatMoney } from '../../lib/cart/data.js';

export interface CartLineItemProps {
  line: CartLine;
  currency: string;
}

export function CartLineItem({ line, currency }: CartLineItemProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(method: 'PATCH' | 'DELETE', body: Record<string, unknown>): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/cart', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not update the cart.');
        return;
      }
      location.reload();
    } catch {
      setError('Could not update the cart.');
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="vt-cart-line flex flex-col gap-unit border-b border-border py-unit">
      <div className="flex items-center gap-gutter">
        {line.image ? (
          <img src={line.image} alt="" className="h-16 w-16 rounded-md object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
        )}
        <div className="flex-1">
          <p className="text-fg">{line.title}</p>
          <p className="text-muted-fg">{formatMoney(line.unitPrice, currency)} each</p>
        </div>
        <p className="text-price">{formatMoney(line.lineTotal, currency)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-gutter">
        <label className="flex items-center gap-unit text-sm text-fg">
          <span className="text-muted-fg">Qty</span>
          <input
            type="number"
            min={1}
            max={999}
            value={line.quantity}
            disabled={pending}
            className="w-16 rounded-md border border-input bg-surface px-unit py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-50"
            onChange={(e) => {
              const quantity = Number(e.target.value);
              if (!Number.isInteger(quantity) || quantity < 1) return;
              void mutate('PATCH', { lineId: line.id, quantity });
            }}
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => void mutate('DELETE', { lineId: line.id })}
          className="text-sm text-muted-fg underline underline-offset-2 transition hover:text-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Remove
        </button>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}
