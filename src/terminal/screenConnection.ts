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
import { cssTokens, monospaceFont, terminalFont } from './terminalTheme'
import { watchLinks, type XtermLinks } from './xtermLinks'
import { XtermScreen } from './xtermScreen'

/**
 * The xterm.js screen of one terminal. It outlives each connection. Each
 * connection gets its own `XtermScreen`, because its bridge reader keeps
 * the nonce of the bridge of one connection.
 */
export interface ScreenParts {
  readonly xterm: Terminal
  readonly fit: FitAddon
  /** The font size of the theme, before a shared size makes it smaller. */
  readonly normalFont: number
  /**
   * Runs `listener` when the screen opens in its host after a wait for a
   * size, before the `onOpen` of the owner. A screen that is open already
   * never runs it. Returns the function that stops it.
   */
  whenOpen(listener: () => void): () => void
  dispose(): void
}

/** DECSTR, the soft reset of the terminal modes. */
const SOFT_RESET = '\x1b[!p'

/** Whether the page lays out the host with a size. */
function hasSize(host: HTMLElement): boolean {
  return host.clientWidth > 0 && host.clientHeight > 0
}

/**
 * Makes the xterm.js screen of a terminal for `host`. The screen takes
 * output at once, and opens in `host` once the host has a size, because
 * xterm.js and the line height measure the font in the page. A host under
 * `display: none`, such as in a hidden column or behind another tool,
 * measures nothing, so the output waits in the buffer of xterm.js. A host
 * with a size opens and fits at once.
 */
export function openScreen(
  host: HTMLElement,
  theme: ITheme,
  options: {
    links: () => TerminalLinks | undefined
    hintClass: string
    /** The screen opened in its host after a wait for a size. */
    onOpen?: () => void
  },
): ScreenParts {
  const xterm = new Terminal({
    ...monospaceFont(cssTokens(host)),
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
  let outputLinks: XtermLinks | null = null
  const opening = new Set<() => void>()
  const open = (): boolean => {
    if (!hasSize(host)) return false
    xterm.options = terminalFont(cssTokens(host), host)
    xterm.open(host)
    outputLinks = watchLinks(xterm, {
      links: options.links,
      linkKey: linkKey(navigator.platform),
      hintClass: options.hintClass,
    })
    return true
  }
  let observer: ResizeObserver | null = null
  // No connection exists yet, so this fit can't undo a shared size.
  if (open()) fit.fit()
  else {
    observer = new ResizeObserver(() => {
      if (xterm.element || !open()) return
      observer?.disconnect()
      // A live connection lays out: it fits, or takes its shared size.
      // Without one, as after a connection that ended while hidden, the
      // screen fits its host here.
      if (opening.size === 0) fit.fit()
      for (const listener of [...opening]) listener()
      opening.clear()
      options.onOpen?.()
    })
    observer.observe(host)
  }
  return {
    xterm,
    fit,
    normalFont: xterm.options.fontSize ?? 12,
    whenOpen(listener) {
      if (xterm.element) return () => undefined
      opening.add(listener)
      return () => opening.delete(listener)
    },
    dispose() {
      observer?.disconnect()
      opening.clear()
      outputLinks?.dispose()
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
 * screen to its box and sends each new size, from the open of the screen.
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
  const { xterm, fit, normalFont } = parts
  // A soft reset turns off the modes of the program of an earlier
  // connection, such as its cursor keys, and keeps the text to copy.
  xterm.write(SOFT_RESET)
  const screen = new XtermScreen(xterm, { links: true })
  if (xterm.options.fontSize !== normalFont) xterm.options.fontSize = normalFont
  delete host.dataset.shared
  let shared: BridgeSize | null = null
  const layout = () => {
    if (!xterm.element || !hasSize(host)) return
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
  // A screen that opens later watches its element before it takes the
  // focus, then lays out as at a resize.
  const stopOpen = parts.whenOpen(() => {
    screen.watchElement()
    layout()
  })
  const observer = new ResizeObserver(layout)
  observer.observe(host)
  let disposed = false
  return {
    session,
    dispose() {
      if (disposed) return
      disposed = true
      stopOpen()
      observer.disconnect()
      stopFirstOutput()
      session.dispose()
      screen.dispose()
    },
  }
}
