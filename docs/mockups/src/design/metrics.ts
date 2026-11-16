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
  /** The least height of a local control; a phone screen raises it to 40px. */
  touchMin: '0px',
  /**
   * The height of the lockup of the brand on the marketing site and the
   * sign-in page. Its tile fills that height, so the clear space that the
   * brand asks for is half of it.
   */
  lockupHeight: '25px',
  /**
   * The height of a screen: the visible part of the window. On a phone,
   * `100vh` is the height with the browser bars hidden, so the page would
   * scroll behind the app while they show. `100dvh` follows the bars. A
   * picture of a screen on the marketing site sets it to the height of its
   * frame.
   */
  screenHeight: '100dvh',
} as const

export type ControlSizes = {
  /** The height of buttons, in px. */
  height: number
  labelSize: number
  labelWeight: 500
  /** The Firna size of inputs, selectors, and segmented controls. */
  field: 'sm' | 'lg'
}

/** The size of the compact Firna controls of the desktop layout. */
export const control: ControlSizes = {
  height: 26,
  labelSize: 12,
  labelWeight: 500,
  field: 'sm',
}

/** On a phone every control is at least 40px high, so a finger can hit it. */
export const touchControl: ControlSizes = {
  height: 40,
  labelSize: 14,
  labelWeight: 500,
  field: 'lg',
}
