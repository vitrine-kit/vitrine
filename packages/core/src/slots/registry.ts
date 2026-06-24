// The slot runtime (contract 3). A framework-agnostic registry: stores name→component
// bindings and returns them by slot, ordered by `order` (lower = higher).
// The React <Slot> wrapper lives in @vitrine-kit/core/react.
import type { SlotId, SlotMount } from '@vitrine-kit/contracts';

export interface SlotRegistry<C = unknown> {
  register(mount: SlotMount<C>): void;
  registerMany(mounts: ReadonlyArray<SlotMount<C>>): void;
  /** A slot's bindings, sorted by order (stable by registration order). */
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

/** The default global registry (the client registers slots in lib/slots.ts). */
export const slotRegistry: SlotRegistry = createSlotRegistry();

export function registerSlot<C = unknown>(mount: SlotMount<C>): void {
  (slotRegistry as SlotRegistry<C>).register(mount);
}

export function getSlotMounts<C = unknown>(slot: SlotId): SlotMount<C>[] {
  return (slotRegistry as SlotRegistry<C>).get(slot);
}
