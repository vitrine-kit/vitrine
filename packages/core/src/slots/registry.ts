// Runtime слотов (контракт 3). Фреймворк-агностичный реестр: хранит привязки
// имя-компонент и отдаёт их по слоту, упорядоченные по order (меньше = выше).
// React-обёртка <Slot> — в @vitrine-kit/core/react.
import type { SlotId, SlotMount } from '@vitrine-kit/contracts';

export interface SlotRegistry<C = unknown> {
  register(mount: SlotMount<C>): void;
  registerMany(mounts: ReadonlyArray<SlotMount<C>>): void;
  /** Привязки слота, отсортированные по order (стабильно по порядку регистрации). */
  get(slot: SlotId): SlotMount<C>[];
  clear(): void;
}

export function createSlotRegistry<C = unknown>(): SlotRegistry<C> {
  const items = new Map<SlotId, Array<{ mount: SlotMount<C>; seq: number }>>();
  let seq = 0;

  function register(mount: SlotMount<C>): void {
    const list = items.get(mount.slot) ?? [];
    list.push({ mount, seq: seq++ });
    items.set(mount.slot, list);
  }

  function registerMany(mounts: ReadonlyArray<SlotMount<C>>): void {
    for (const m of mounts) register(m);
  }

  function get(slot: SlotId): SlotMount<C>[] {
    const list = items.get(slot) ?? [];
    return [...list]
      .sort((a, b) => (a.mount.order ?? 0) - (b.mount.order ?? 0) || a.seq - b.seq)
      .map((x) => x.mount);
  }

  function clear(): void {
    items.clear();
    seq = 0;
  }

  return { register, registerMany, get, clear };
}

/** Глобальный реестр по умолчанию (клиент регистрирует слоты в lib/slots.ts). */
export const slotRegistry: SlotRegistry = createSlotRegistry();

export function registerSlot<C = unknown>(mount: SlotMount<C>): void {
  (slotRegistry as SlotRegistry<C>).register(mount);
}

export function getSlotMounts<C = unknown>(slot: SlotId): SlotMount<C>[] {
  return (slotRegistry as SlotRegistry<C>).get(slot);
}
