import type { SharedUiFonts, SharedUiRadii } from '@firna/ui/theme'

/** Inter ships with the catalogue. The other names are system fallbacks. */
const sansFont =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

/** System monospace fonts only: the catalogue adds no font files for them. */
const monoFont =
  "'SF Mono', ui-monospace, Menlo, 'Source Code Pro', Consolas, 'Liberation Mono', monospace"

export const fonts: SharedUiFonts = { sans: sansFont, mono: monoFont }

/** Small radii, so that the dense layout keeps crisp edges. */
export const radii: Partial<SharedUiRadii> = {
  sm: 3,
  md: 4,
  lg: 6,
  xl: 8,
  xxl: 10,
}

/**
 * Type, density, and size tokens, as CSS values. Labels such as tabs,
 * section names, and times use the monospace font in capitals.
 */
export const metrics = {
  fontLabel: 'var(--ui-font-mono)',
  textLabel: '10.5px',
  textXs: '11px',
  textSm: '12px',
  textMd: '13px',
  textLg: '13.5px',
  textXl: '16px',
  leadingChat: '1.6',
  weightStrong: '600',
  weightHeading: '600',
  trackingHeading: '-0.005em',
  trackingLabel: '0.06em',
  labelCase: 'uppercase',
  rowHeight: '26px',
  barHeight: '34px',
  padX: '12px',
  chatWidth: '780px',
  chatGap: '14px',
  sidebarWidth: '232px',
  railWidth: '48px',
  rightWidth: '440px',
} as const

/** The size of the compact Firna controls, in px. */
export const control = {
  height: 26,
  labelSize: 12,
  labelWeight: 500,
  /** The Firna size of inputs, selectors, and segmented controls. */
  field: 'sm',
} as const
