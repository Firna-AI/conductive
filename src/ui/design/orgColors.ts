import type { SharedUiTheme } from '@firna/ui/theme'
import { ORG_COLORS, type OrgColor } from '../../shared/org-colors'

export { ORG_COLORS, type OrgColor }

/** The two colours of an org tile: its initials and its outline. */
type TileTint = { ink: string; border: string }

type Preset = {
  label: string
  /** Absent for Blue, which takes the accent of the theme. */
  dark?: TileTint
  light?: TileTint
}

/**
 * The preset colours of an org. Each ink keeps a contrast of 4.5:1 or more
 * on the `soft` fill of the tile in its scheme, as `Avatar` asks. Each
 * outline mixes the ink with the rail, as `primaryBorder` does for Blue.
 */
const presets: Readonly<Record<OrgColor, Preset>> = {
  blue: { label: 'Blue' },
  teal: {
    label: 'Teal',
    dark: { ink: '#2dd4bf', border: '#164e48' },
    light: { ink: '#0f766e', border: '#c3dddb' },
  },
  green: {
    label: 'Green',
    dark: { ink: '#4ade80', border: '#205134' },
    light: { ink: '#17723d', border: '#c5dccf' },
  },
  yellow: {
    label: 'Yellow',
    dark: { ink: '#facc15', border: '#5a4b10' },
    light: { ink: '#8a6100', border: '#e2d8bf' },
  },
  orange: {
    label: 'Orange',
    dark: { ink: '#fb923c', border: '#5a381d' },
    light: { ink: '#b4480a', border: '#ecd1c2' },
  },
  red: {
    label: 'Red',
    dark: { ink: '#ff6e6e', border: '#5c2c2e' },
    light: { ink: '#c8323a', border: '#f1ccce' },
  },
  pink: {
    label: 'Pink',
    dark: { ink: '#f472b6', border: '#582e45' },
    light: { ink: '#be185d', border: '#efc5d7' },
  },
  purple: {
    label: 'Purple',
    dark: { ink: '#b794f6', border: '#44395b' },
    light: { ink: '#7345d1', border: '#dcd1f4' },
  },
}

/** The name of a colour, as General settings shows it. */
export function orgColorLabel(color: OrgColor): string {
  return presets[color].label
}

/** The initials and the outline of the tile of an open org in a colour. */
export function orgTileTint(
  color: OrgColor,
  theme: Pick<SharedUiTheme, 'scheme' | 'colors'>,
): TileTint {
  const tint = presets[color][theme.scheme]
  return (
    tint ?? { ink: theme.colors.primary, border: theme.colors.primaryBorder }
  )
}
