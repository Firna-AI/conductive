import type { ColorScheme } from '@mokly/mokly'
import {
  createSharedUiTheme,
  darkSharedUiTheme,
  defaultSharedUiTheme,
  type SharedUiTheme,
} from '@firna/ui/theme'
import { darkPalette, lightPalette } from './design/palette'
import { control, fonts, metrics, radii } from './design/metrics'

/** The Firna theme of the design in a colour scheme. */
export function themeFor(scheme: ColorScheme): SharedUiTheme {
  const dark = scheme === 'dark'
  return createSharedUiTheme(
    { colors: dark ? darkPalette : lightPalette, fonts, radii, scheme },
    dark ? darkSharedUiTheme : defaultSharedUiTheme,
  )
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function declarations(values: Readonly<Record<string, string>>): string[] {
  return Object.entries(values).map(
    ([name, value]) => `--ui-${kebab(name)}:${value}`,
  )
}

/**
 * The design tokens as CSS custom properties: the colours of the scheme,
 * the type, density, and size metrics, the radii, and the fonts.
 */
export function tokensCss(scheme: ColorScheme): string {
  const theme = themeFor(scheme)
  const radiiCss = Object.entries(theme.radii).map(
    ([name, value]) => `--ui-radius-${kebab(name)}:${value}px`,
  )
  const all = [
    ...declarations(scheme === 'dark' ? darkPalette : lightPalette),
    ...declarations(metrics),
    ...radiiCss,
    `--ui-control-height:${control.height}px`,
    `--ui-font-sans:${theme.fonts.sans}`,
    `--ui-font-mono:${theme.fonts.mono}`,
  ]
  return `:root{${all.join(';')}}`
}
