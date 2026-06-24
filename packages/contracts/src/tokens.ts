// Contract 1 · Tokens
// CSS variable names and the Tailwind preset. The contract fixes the NAMES (roles),
// not the values. Values are set by the design step in theme/<client>.css (spec §11).
// Matches docs/contracts-v1-proposal.md (approved).

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

/** Single "knobs" without a group. */
export const SINGLETON_TOKENS = ['density', 'border-width'] as const;
export type SingletonToken = (typeof SINGLETON_TOKENS)[number];

/** CSS variable name for a token: cssVar('color','primary') → '--vt-color-primary'. */
export function cssVar(group: string, name?: string): `--vt-${string}` {
  return (name ? `--vt-${group}-${name}` : `--vt-${group}`) as `--vt-${string}`;
}

/** Full list of the contract's CSS variable names — for theme scaffolding and docs. */
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
 * The Vitrine Tailwind preset: maps Tailwind keys to the contract's CSS variables.
 * Used in the client's tailwind.config: `presets: [vitrinePreset]`.
 * Loosely typed so contracts don't take a dependency on tailwindcss.
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
