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
  return createElement(
    Fragment,
    null,
    ...mounts.map((m, i) => createElement(m.component, { key: i, ...rest })),
  );
}
