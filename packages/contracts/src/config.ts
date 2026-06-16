// Контракт 4 · Config
// Типизированный site.config: backend, tier, флаги features, layout.sections,
// тема, интеграции, i18n. Источник истины — zod; JSON Schema генерится отсюда.
import { z } from 'zod';
import { backendSchema, tierSchema } from './common.js';
import { slotIdSchema } from './slots.js';

/** Переопределение/порядок секции страницы (композиция поверх wireframe). */
export const layoutSectionSchema = z.object({
  slot: slotIdSchema,
  enabled: z.boolean().default(true),
  /** Путь к override-компоненту в репо клиента (уникальное — как override, §13). */
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
    defaultLocale: z.string().default('ru'),
    locales: z.array(z.string()).default(['ru']),
    currency: z.string().default('RUB'),
    priceFormat: z.string().optional(),
  })
  .default({ defaultLocale: 'ru', locales: ['ru'], currency: 'RUB' });

export const themeSchema = z
  .object({
    name: z.string().default('default'),
    /** Файл со значениями токенов (заполняет дизайн-шаг). */
    cssFile: z.string().default('theme/client.css'),
  })
  .default({ name: 'default', cssFile: 'theme/client.css' });

export const siteConfigSchema = z.object({
  backend: backendSchema,
  tier: tierSchema,
  /** Флаги фич: { 'reviews': true }. Поднимаются примитивом установки. */
  features: z.record(z.string(), z.boolean()).default({}),
  layout: z
    .object({ sections: z.array(layoutSectionSchema).default([]) })
    .default({ sections: [] }),
  theme: themeSchema,
  integrations: integrationsSchema,
  i18n: i18nSchema,
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
