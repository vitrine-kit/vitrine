// "Add to cart" button — client component. Mounted into the product.purchase slot
// (ProductView passes product). Supports option-based variants from the demo seed
// (size/color). Mutation goes through POST /api/cart (the feature's route).
'use client';
import { useMemo, useState } from 'react';
import type { Product, Variant } from '@vitrine-kit/contracts';

export interface AddToCartProps {
  product: Product;
}

function optionKeys(variants: Variant[]): string[] {
  const keys = new Set<string>();
  for (const v of variants) {
    for (const key of Object.keys(v.options ?? {})) keys.add(key);
  }
  return [...keys];
}

function valuesFor(variants: Variant[], key: string): string[] {
  const values = new Set<string>();
  for (const v of variants) {
    const value = v.options?.[key];
    if (value) values.add(value);
  }
  return [...values];
}

function matchVariant(
  variants: Variant[],
  selected: Record<string, string>,
  keys: string[],
): Variant | undefined {
  return variants.find((v) => keys.every((key) => (v.options?.[key] ?? '') === (selected[key] ?? '')));
}

function firstAvailable(variants: Variant[]): Variant | undefined {
  return variants.find((v) => v.stock == null || v.stock > 0) ?? variants[0];
}

function variantLabel(variant: Variant): string {
  const opts = variant.options;
  if (opts && Object.keys(opts).length > 0) {
    return Object.entries(opts)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return variant.title ?? variant.sku;
}

export function AddToCart({ product }: AddToCartProps) {
  const variants = product.variants;
  const keys = useMemo(() => optionKeys(variants), [variants]);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>(() => ({
    ...(firstAvailable(variants)?.options ?? {}),
  }));
  const [variantId, setVariantId] = useState<string | undefined>(() => firstAvailable(variants)?.id);

  const matched =
    keys.length > 0 ? matchVariant(variants, selected, keys) : variants.find((v) => v.id === variantId);
  const active = matched ?? firstAvailable(variants);
  const activeId = active?.id;
  const outOfStock = active != null && active.stock != null && active.stock <= 0;

  async function add(): Promise<void> {
    if (!activeId || outOfStock) return;
    setPending(true);
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variantId: activeId, quantity: 1 }),
      });
      location.assign('/cart');
    } finally {
      setPending(false);
    }
  }

  if (variants.length === 0) {
    return <p className="text-muted-fg">This product has no purchasable variants yet.</p>;
  }

  return (
    <div className="vt-add-to-cart-wrap flex flex-col gap-gutter">
      {keys.length > 0 ? (
        keys.map((key) => (
          <label key={key} className="flex flex-col gap-unit text-sm">
            <span className="font-medium capitalize text-fg">{key}</span>
            <select
              className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
              value={selected[key] ?? ''}
              onChange={(e) => setSelected((prev) => ({ ...prev, [key]: e.target.value }))}
            >
              {valuesFor(variants, key).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))
      ) : variants.length > 1 ? (
        <label className="flex flex-col gap-unit text-sm">
          <span className="font-medium text-fg">Option</span>
          <select
            className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
            value={activeId ?? ''}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock != null && v.stock <= 0}>
                {variantLabel(v)}
                {v.stock != null && v.stock <= 0 ? ' (out of stock)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        onClick={add}
        disabled={pending || !activeId || outOfStock}
        className="vt-add-to-cart rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        {pending ? 'Adding…' : outOfStock ? 'Out of stock' : 'Add to cart'}
      </button>
    </div>
  );
}
