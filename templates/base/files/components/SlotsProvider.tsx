// Ensures feature slot mounts are registered in the browser bundle.
// Server layout also calls registerSlots() for SSR; this covers hydration.
'use client';

import type { ReactNode } from 'react';
import { registerSlots } from '@/lib/slots';

let registered = false;

function ensureRegistered(): void {
  if (registered) return;
  registerSlots();
  registered = true;
}

export function SlotsProvider({ children }: { children: ReactNode }) {
  ensureRegistered();
  return children;
}
