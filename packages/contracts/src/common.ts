// Shared enums used across several contracts/manifests.
import { z } from 'zod';

export const TIERS = ['catalog', 'simple-store', 'full-store'] as const;
export type Tier = (typeof TIERS)[number];
export const tierSchema = z.enum(TIERS);

export const BACKENDS = ['payload', 'vendure'] as const;
export type Backend = (typeof BACKENDS)[number];
export const backendSchema = z.enum(BACKENDS);
