// Контракт 1 · Tokens
// Имена CSS-переменных и Tailwind-preset. Контракт фиксирует ИМЕНА (роли),
// не значения. Значения задаёт дизайн-шаг в theme/<client>.css (§11 спеки).
// Соответствует docs/contracts-v1-proposal.md (утверждён).

export const COLOR_TOKENS = [
  'bg', 'fg',
  'muted', 'muted-fg',
  'surface', 'surface-fg',
  'border', 'input', 'ring',
  'primary', 'primary-fg',
  'secondary', 'secondary-fg',
  'accent', 'accent-fg',
  'success', 'warning', 'danger', 'danger-fg',
  'price', 'sale',
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export const FONT_TOKENS = ['sans', 'heading', 'mono'] as const;
export type FontToken = (typeof FONT_TOKENS)[number];

export const FONT_WEIGHT_TOKENS = ['normal', 'medium', 'bold', 'heading'] as const;
export type FontWeightToken = (typeof FONT_WEIGHT_TOKENS)[number];

export const LEADING_TOKENS = ['tight', 'normal', 'relaxed'] as const;
export type LeadingToken = (typeof LEADING_TOKENS)[number];

export const TRACKING_TOKENS = ['tight', 'normal', 'wide'] as const;
export type TrackingToken = (typeof TRACKING_TOKENS)[number];

export const RADIUS_TOKENS = ['base', 'sm', 'md', 'lg', 'full'] as const;
export type RadiusToken = (typeof RADIUS_TOKENS)[number];

export const SHADOW_TOKENS = ['sm', 'md', 'lg', 'color'] as const;
export type ShadowToken = (typeof SHADOW_TOKENS)[number];

export const SPACE_TOKENS = ['unit', 'container-max', 'container-padding', 'section-gap'] as const;
export type SpaceToken = (typeof SPACE_TOKENS)[number];

export const MOTION_TOKENS = ['duration-fast', 'duration-normal', 'ease-default'] as const;
export type MotionToken = (typeof MOTION_TOKENS)[number];

/** Одиночные «ручки» без группы. */
export const SINGLETON_TOKENS = ['density', 'border-width'] as const;
export type SingletonToken = (typeof SINGLETON_TOKENS)[number];

/** Имя CSS-переменной для токена: cssVar('color','primary') → '--vt-color-primary'. */
export function cssVar(group: string, name?: string): `--vt-${string}` {
  return (name ? `--vt-${group}-${name}` : `--vt-${group}`) as `--vt-${string}`;
}

/** Полный перечень имён CSS-переменных контракта — для скаффолда theme и доков. */
export const TOKEN_CSS_VARS: string[] = [
  ...COLOR_TOKENS.map((t) => cssVar('color', t)),
  ...FONT_TOKENS.map((t) => cssVar('font', t)),
  ...FONT_WEIGHT_TOKENS.map((t) => cssVar('weight', t)),
  ...LEADING_TOKENS.map((t) => cssVar('leading', t)),
  ...TRACKING_TOKENS.map((t) => cssVar('tracking', t)),
  ...RADIUS_TOKENS.map((t) => cssVar('radius', t)),
  ...SHADOW_TOKENS.map((t) => cssVar('shadow', t)),
  ...SPACE_TOKENS.map((t) => cssVar('space', t)),
  ...MOTION_TOKENS.map((t) => cssVar('motion', t)),
  ...SINGLETON_TOKENS.map((t) => cssVar(t)),
];

const ref = (group: string, name?: string) => `var(${cssVar(group, name)})`;

/**
 * Tailwind-preset Vitrine: маппит ключи Tailwind на CSS-переменные контракта.
 * Используется в клиентском tailwind.config: `presets: [vitrinePreset]`.
 * Типизирован свободно, чтобы не тащить зависимость на tailwindcss в контракты.
 */
export const vitrinePreset: { theme: { extend: Record<string, unknown> } } = {
  theme: {
    extend: {
      colors: Object.fromEntries(
        COLOR_TOKENS.map((t) => [t, ref('color', t)]),
      ),
      fontFamily: {
        sans: ref('font', 'sans'),
        heading: ref('font', 'heading'),
        mono: ref('font', 'mono'),
      },
      fontWeight: Object.fromEntries(
        FONT_WEIGHT_TOKENS.map((t) => [t, ref('weight', t)]),
      ),
      lineHeight: Object.fromEntries(
        LEADING_TOKENS.map((t) => [t, ref('leading', t)]),
      ),
      letterSpacing: Object.fromEntries(
        TRACKING_TOKENS.map((t) => [t, ref('tracking', t)]),
      ),
      borderRadius: Object.fromEntries(
        RADIUS_TOKENS.map((t) => [t, ref('radius', t)]),
      ),
      boxShadow: {
        sm: ref('shadow', 'sm'),
        md: ref('shadow', 'md'),
        lg: ref('shadow', 'lg'),
      },
      borderWidth: { DEFAULT: ref('border-width') },
      maxWidth: { container: ref('space', 'container-max') },
      spacing: {
        unit: ref('space', 'unit'),
        gutter: ref('space', 'container-padding'),
        section: ref('space', 'section-gap'),
      },
      transitionDuration: {
        fast: ref('motion', 'duration-fast'),
        normal: ref('motion', 'duration-normal'),
      },
      transitionTimingFunction: { DEFAULT: ref('motion', 'ease-default') },
    },
  },
};
