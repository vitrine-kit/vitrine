// React-обёртка слотов: <Slot name="product.below-description" />.
// Рендерит зарегистрированные компоненты слота по порядку (order). React —
// опциональный peer; импортируется из подпути @vitrine-kit/core/react.
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
  /** Реестр (по умолчанию — глобальный). Для тестов/изоляции можно передать свой. */
  registry?: SlotComponentRegistry;
  /** Что рендерить, если слот пуст. */
  fallback?: ReactNode;
  /** Остальные пропсы прокидываются в каждый смонтированный компонент. */
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
