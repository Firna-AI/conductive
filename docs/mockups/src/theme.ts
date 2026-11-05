import type { ColorScheme } from '@mokly/mokly'
import {
  darkSharedUiTheme,
  defaultSharedUiTheme,
  type SharedUiTheme,
} from '@firna/ui/theme'

export function themeFor(scheme: ColorScheme): SharedUiTheme {
  return scheme === 'dark' ? darkSharedUiTheme : defaultSharedUiTheme
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

export function themeVariablesCss(theme: SharedUiTheme): string {
  const colors = Object.entries(theme.colors).map(
    ([name, value]) => `--ui-${kebab(name)}:${value}`,
  )
  const radii = Object.entries(theme.radii).map(
    ([name, value]) => `--ui-radius-${kebab(name)}:${value}px`,
  )
  const fonts = [
    `--ui-font-sans:${theme.fonts.sans}`,
    `--ui-font-mono:${theme.fonts.mono}`,
  ]
  return `:root{${[...colors, ...radii, ...fonts].join(';')}}`
}
