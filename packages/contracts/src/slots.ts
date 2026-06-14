// Контракт 3 · Slots
// Именованные слоты страниц + декларация регистрации. Замкнутый набор v1
// (утверждён, docs/contracts-v1-proposal.md). Расширять ТОЛЬКО аддитивно.
import { z } from 'zod';

/** 31 слот v1. Порядок и группировка — как в утверждённом предложении. */
export const SLOT_IDS = [
  // global — на всех страницах
  'global.banner-top', 'global.header-start', 'global.header-nav',
  'global.header-actions', 'global.footer', 'global.body-end',
  // home
  'home.hero', 'home.below-hero', 'home.sections', 'home.bottom',
  // catalog — листинг/грид
  'catalog.toolbar', 'catalog.sidebar', 'catalog.grid-top', 'catalog.grid-bottom',
  // category
  'category.header', 'category.below-products',
  // product
  'product.gallery', 'product.below-title', 'product.below-price',
  'product.purchase', 'product.below-description', 'product.tabs', 'product.related',
  // cart
  'cart.items-bottom', 'cart.summary', 'cart.below',
  // checkout
  'checkout.top', 'checkout.below',
  // order
  'order.top', 'order.below',
  // search
  'search.results-top', 'search.empty',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

/** Zod-перечисление слотов (для валидации feature.json / site.config). */
export const slotIdSchema = z.enum(SLOT_IDS);

/**
 * Декларативная регистрация слота в манифесте фичи (feature.json, §8 спеки):
 * component — ИМЯ компонента, резолвится в репозитории клиента.
 */
export const slotRegistrationSchema = z.object({
  slot: slotIdSchema,
  component: z.string().min(1),
  order: z.number().int().optional(),
});
export type SlotRegistration = z.infer<typeof slotRegistrationSchema>;

/**
 * Рантайм-привязка имени к фактическому компоненту (используется @maks417/core
 * в lib/slots.ts клиента). Дженерик по типу компонента, чтобы контракт не
 * зависел от React.
 */
export interface SlotMount<TComponent = unknown> {
  slot: SlotId;
  component: TComponent;
  order?: number;
}
