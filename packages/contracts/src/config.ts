// Contract 4 · Config
// Typed site.config: backend, tier, feature flags, layout.sections,
// theme, integrations, i18n. Source of truth is zod; JSON Schema is generated from here.
import { z } from 'zod';
import { backendSchema, tierSchema } from './common.js';
import { slotIdSchema } from './slots.js';

/** Override/ordering of a page section (composition over the wireframe). */
export const layoutSectionSchema = z.object({
  slot: slotIdSchema,
  enabled: z.boolean().default(true),
  /** Path to the override component in the client repo (unique — as an override, §13). */
  override: z.string().optional(),
});
export type LayoutSection = z.infer<typeof layoutSectionSchema>;

export const integrationsSchema = z
  .object({
    payments: z.enum(['stripe', 'paddle', 'yookassa']).optional(),
    email: z.string().optional(),
    analytics: z.string().optional(),
    media: z.string().optional(),
    shipping: z.string().optional(),
  })
  .default({});

export const i18nSchema = z
  .object({
    defaultLocale: z.string().default('en'),
    locales: z.array(z.string()).default(['en']),
    currency: z.string().default('USD'),
    priceFormat: z.string().optional(),
  })
  .default({ defaultLocale: 'en', locales: ['en'], currency: 'USD' });

export const themeSchema = z
  .object({
    name: z.string().default('default'),
    /** File with token values (filled by the design step). */
    cssFile: z.string().default('theme/client.css'),
  })
  .default({ name: 'default', cssFile: 'theme/client.css' });

export const siteConfigSchema = z.object({
  backend: backendSchema,
  tier: tierSchema,
  /** Feature flags: { 'reviews': true }. Set by the install primitive. */
  features: z.record(z.string(), z.boolean()).default({}),
  layout: z
    .object({ sections: z.array(layoutSectionSchema).default([]) })
    .default({ sections: [] }),
  theme: themeSchema,
  integrations: integrationsSchema,
  i18n: i18nSchema,
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
