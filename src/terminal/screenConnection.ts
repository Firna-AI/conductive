import { FitAddon } from '@xterm/addon-fit'
import { Terminal, type ITheme } from '@xterm/xterm'
import type { TerminalEnd, TerminalTransport } from '../shared/terminal'
import {
  TERMINAL_HISTORY_LINES,
  type BridgeSize,
} from '../shared/terminal-bridge'
import type { TerminalLinks } from './terminalLinks'
import { linkKey } from './terminalLinks'
import { fittedFontSize } from './sharedSize'
import { TerminalSession } from './terminalSession'
import { cssTokens, terminalFont } from './terminalTheme'
import { watchLinks } from './xtermLinks'
import { XtermScreen } from './xtermScreen'

/** The xterm.js screen of one terminal. It outlives each connection. */
export interface ScreenParts {
  readonly xterm: Terminal
  readonly fit: FitAddon
  readonly screen: XtermScreen
  /** The font size of the theme, before a shared size makes it smaller. */
  readonly normalFont: number
  dispose(): void
}

function fitVisible(host: HTMLElement, fit: FitAddon): void {
  if (host.clientWidth > 0 && host.clientHeight > 0) fit.fit()
}

/** Opens the xterm.js screen of a terminal in `host`. */
export function openScreen(
  host: HTMLElement,
  theme: ITheme,
  options: { links: () => TerminalLinks | undefined; hintClass: string },
): ScreenParts {
  const xterm = new Terminal({
    ...terminalFont(cssTokens(host), host),
    theme,
    // Bold keeps its colour, as the bold prompt of the mockup does.
    drawBoldTextInBrightColors: false,
    minimumContrastRatio: 4.5,
    // On a Mac, an Option press selects while a program has the mouse. The
    // screen sends each plain press again with Option, so a drag selects.
    macOptionClickForcesSelection: true,
    // The same history as tmux keeps, so a reload shows the same lines.
    scrollback: TERMINAL_HISTORY_LINES,
  })
  const fit = new FitAddon()
  xterm.loadAddon(fit)
  xterm.open(host)
  fitVisible(host, fit)
  const screen = new XtermScreen(xterm, { links: true })
  const outputLinks = watchLinks(xterm, {
    links: options.links,
    linkKey: linkKey(navigator.platform),
    hintClass: options.hintClass,
  })
  return {
    xterm,
    fit,
    screen,
    normalFont: xterm.options.fontSize ?? 12,
    dispose() {
      outputLinks?.dispose()
      screen.dispose()
      xterm.dispose()
    },
  }
}

export interface ConnectionEvents {
  /** The connection ended `lasted` milliseconds after its first output, or with no output, as 0. */
  onClosed(end: TerminalEnd, lasted: number): void
  onControlChange(held: boolean): void
  onInput(): void
}

/**
 * Connects the screen to one transport. The screen keeps the output of an
 * earlier connection until this one shows its own, so a connection that
 * fails before its first output leaves that output to copy. It fits the
 * screen to its box and sends each new size.
 *
 * With the terminal bridge, all viewers share one size. The screen then
 * sends the size of its panel, counted at the normal font, and shows the
 * shared size. A larger shared size gets a smaller font, down to 6px, and
 * the panel scrolls when even that does not fit. A smaller one leaves empty
 * space after it.
 */
export function connectScreen(
  parts: ScreenParts,
  host: HTMLElement,
  transport: TerminalTransport,
  events: ConnectionEvents,
): { session: TerminalSession; dispose(): void } {
  const { xterm, fit, screen, normalFont } = parts
  if (xterm.options.fontSize !== normalFont) xterm.options.fontSize = normalFont
  delete host.dataset.shared
  let shared: BridgeSize | null = null
  const layout = () => {
    if (host.clientWidth <= 0 || host.clientHeight <= 0) return
    if (!shared) {
      fit.fit()
      return
    }
    // The panel size counts at the normal font. xterm.js measures a new
    // font at once and draws in the next frame, so the change does not show.
    if (xterm.options.fontSize !== normalFont)
      xterm.options.fontSize = normalFont
    // Measure without the scrollbars of a shared size that does not fit.
    host.style.overflow = 'hidden'
    const panel = fit.proposeDimensions()
    host.style.overflow = ''
    if (!panel || Number.isNaN(panel.cols) || Number.isNaN(panel.rows)) return
    session.resizePanel(panel.cols, panel.rows)
    const fontSize = fittedFontSize(normalFont, panel, shared)
    if (fontSize !== normalFont) xterm.options.fontSize = fontSize
    const smaller = shared.columns < panel.cols || shared.rows < panel.rows
    host.dataset.shared = smaller ? 'smaller' : 'fits'
  }
  // This listener runs before the session writes, so the first output of
  // this connection replaces the output of an earlier one.
  let firstOutput: number | null = null
  const stopFirstOutput = transport.onData(() => {
    if (firstOutput !== null) return
    firstOutput = Date.now()
    xterm.reset()
  })
  const session = new TerminalSession(screen, transport, {
    // A connection counts from its first output, so one that never worked
    // lasted no time.
    onClosed: (end) =>
      events.onClosed(end, firstOutput === null ? 0 : Date.now() - firstOutput),
    onControlChange: events.onControlChange,
    onInput: events.onInput,
    onSharedSize: (size) => {
      shared = size
      layout()
    },
  })
  session.start()
  const observer = new ResizeObserver(layout)
  observer.observe(host)
  let disposed = false
  return {
    session,
    dispose() {
      if (disposed) return
      disposed = true
      observer.disconnect()
      stopFirstOutput()
      session.dispose()
    },
  }
}
