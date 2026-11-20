import type { ITerminalOptions, ITheme } from '@xterm/xterm'

/** Reads one design token, such as `ink`, or gives undefined when it is not set. */
export type ReadToken = (name: string) => string | undefined

/** Reads the `--ui-*` design tokens that apply to an element. */
export function cssTokens(element: Element): ReadToken {
  const style = getComputedStyle(element)
  return (name) => style.getPropertyValue(`--ui-${name}`).trim() || undefined
}

/**
 * The colours of the terminal in the app's scheme, as the mockup draws it:
 * the surface and the ink, the prompt colour for cyan, the muted tone for
 * bright black, and the status colours for red, green, and yellow.
 */
export function terminalTheme(
  read: ReadToken,
  scheme: 'light' | 'dark',
): ITheme {
  const dark = scheme === 'dark'
  return {
    background: read('surface'),
    foreground: read('ink'),
    cursor: read('ink'),
    cursorAccent: read('surface'),
    selectionBackground: read('primary-border'),
    black: read(dark ? 'border2' : 'ink'),
    red: read('rose'),
    green: read('success'),
    yellow: read('warning'),
    blue: read('code-type'),
    magenta: read('code-keyword'),
    cyan: read('term-prompt'),
    white: read(dark ? 'ink2' : 'faint'),
    brightBlack: read('muted'),
    brightRed: read('rose-deep'),
    brightGreen: read('success'),
    brightYellow: read('amber-deep'),
    brightBlue: read('code-type'),
    brightMagenta: read('code-keyword'),
    brightCyan: read('primary-deep'),
    brightWhite: read(dark ? 'ink' : 'border2'),
  }
}

/** The mockup's monospace font and its size, from the tokens. */
export function monospaceFont(read: ReadToken): {
  fontFamily: string | undefined
  fontSize: number
} {
  return {
    fontFamily: read('font-mono'),
    fontSize: Number.parseFloat(read('text-sm') ?? '') || 12,
  }
}

/** The mockup terminal sets each line 1.6 times the font size apart. */
const lineSpacing = 1.6

/**
 * The type of the terminal: the mockup's monospace font, size, and line
 * spacing. xterm.js sets its rows `lineHeight` times the height of a
 * character apart, and it measures that height with its own method. This
 * helper measures the natural height of the font in the DOM: the height of
 * a hidden `W` in `host`, with the font, the size, and `line-height:
 * normal`. The factor is the wanted spacing over that height, so the rows
 * stand 1.6 times the font size apart while the two measures agree. Under
 * `display: none` the `W` has no height, and the factor is then 1, so call
 * this only once the page lays out `host` with a size.
 */
export function terminalFont(
  read: ReadToken,
  host: HTMLElement,
): ITerminalOptions {
  const { fontFamily, fontSize } = monospaceFont(read)
  const probe = document.createElement('span')
  probe.textContent = 'W'
  probe.style.cssText =
    'position:absolute;visibility:hidden;line-height:normal;white-space:pre'
  probe.style.fontFamily = fontFamily ?? 'monospace'
  probe.style.fontSize = `${fontSize}px`
  host.append(probe)
  const natural = Math.ceil(probe.getBoundingClientRect().height)
  probe.remove()
  const lineHeight =
    natural > 0 ? Math.max(1, (fontSize * lineSpacing) / natural) : 1
  return { fontFamily, fontSize, lineHeight }
}
