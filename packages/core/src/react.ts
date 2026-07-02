// The React slot wrapper: <Slot name="product.below-description" />.
// Renders the slot's registered components in order. React is an
// optional peer; imported from the @vitrine-kit/core/react subpath.
import {
  createElement,
  Fragment,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { SlotId } from '@vitrine-kit/contracts';
import { slotRegistry, type SlotRegistry } from './slots/registry.js';

type SlotComponentRegistry = SlotRegistry<ComponentType<Record<string, unknown>>>;

export interface SlotProps {
  name: SlotId;
  /** The registry (global by default). Pass your own for tests/isolation. */
  registry?: SlotComponentRegistry;
  /** What to render if the slot is empty. */
  fallback?: ReactNode;
  /** The remaining props are forwarded to each mounted component. */
  [prop: string]: unknown;
}

export function Slot(props: SlotProps): ReactNode {
  const { name, registry, fallback = null, ...rest } = props;
  const reg = registry ?? (slotRegistry as unknown as SlotComponentRegistry);
  const mounts = reg.get(name);
  if (mounts.length === 0) return fallback;
  // Keys: component name + occurrence, not the array index — an index key would hand
  // a component's state to a DIFFERENT component when mounts are re-registered in
  // another order at runtime.
  const seen = new Map<string, number>();
  return createElement(
    Fragment,
    null,
    ...mounts.map((m) => {
      const c = m.component as { displayName?: string; name?: string };
      const base = c.displayName ?? (c.name || 'mount');
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return createElement(m.component, { key: n === 0 ? base : `${base}:${n}`, ...rest });
    }),
  );
}
