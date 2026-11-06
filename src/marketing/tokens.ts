import {
  darkPalette,
  lightPalette,
} from '../../docs/mockups/src/design/palette'
import { fonts, metrics, radii } from '../../docs/mockups/src/design/metrics'

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function declarations(values: Readonly<Record<string, string>>): string {
  return Object.entries(values)
    .map(([name, value]) => `--ui-${kebab(name)}:${value}`)
    .join(';')
}

/**
 * The design tokens of the mockups as `--ui-*` custom properties, with the
 * names that the mockup renderer writes. The site is dark first, as the
 * design is. A visitor who prefers light gets the light scheme.
 */
export function tokensCss(): string {
  const radiiCss = Object.entries(radii)
    .map(([name, value]) => `--ui-radius-${kebab(name)}:${value}px`)
    .join(';')
  const shared = [
    declarations(metrics),
    radiiCss,
    `--ui-font-sans:${fonts.sans}`,
    `--ui-font-mono:${fonts.mono}`,
  ].join(';')
  return [
    `:root{color-scheme:dark;${declarations(darkPalette)};${shared}}`,
    `@media (prefers-color-scheme: light){:root{color-scheme:light;${declarations(lightPalette)}}}`,
  ].join('')
}
