import type { IDisposable, IFunctionIdentifier, Terminal } from '@xterm/xterm'
import { BRIDGE_OSC } from '../shared/terminal-bridge'
import { BridgeReader, hexColour, type BridgeEvent } from './bridgeLink'
import { forcedSelectionKey, keepPlainPresses } from './plainPresses'
import type { TerminalScreen } from './terminalSession'

type Listener = (data: string) => void
type MouseListener = (data: string, binary: boolean) => void

/**
 * Whether the data is one mouse report in the SGR encoding. xterm.js sends
 * each report in its own data event, and no key has this form.
 */
function isSgrMouseReport(data: string): boolean {
  return data.startsWith('\x1b[<') && /^\d+;\d+;\d+[Mm]$/.test(data.slice(3))
}

/**
 * The control sequences of programs that xterm.js 6 answers by itself. It
 * sends each answer through `onData`, the same event as the user's keys.
 */
const csiRequests: readonly IFunctionIdentifier[] = [
  { final: 'c' }, // device attributes
  { prefix: '>', final: 'c' }, // secondary device attributes
  { final: 'n' }, // status and cursor position
  { prefix: '?', final: 'n' }, // cursor position, DEC form
  { intermediates: '$', final: 'p' }, // state of a mode
  { prefix: '?', intermediates: '$', final: 'p' }, // state of a DEC mode
  { final: 't' }, // window and text area size
  { prefix: '?', final: 'h' }, // focus reports on: the focus is reported at once
]
const dcsRequests: readonly IFunctionIdentifier[] = [
  { intermediates: '$', final: 'q' }, // state of a setting
]
/** Requests of the palette, text, background, and cursor colours. */
const oscRequests: readonly number[] = [4, 10, 11, 12]
/** Turns off each mouse mode of xterm.js: X10, normal, drag, and any move. */
const mouseModesOff = '\x1b[?9l\x1b[?1000l\x1b[?1002l\x1b[?1003l'

function subscribe(listeners: Set<Listener>, listener: Listener): IDisposable {
  listeners.add(listener)
  return { dispose: () => listeners.delete(listener) }
}

/**
 * The xterm.js terminal of a session, with its data split by source. Each of
 * its own replies is marked where it starts: a parser hook runs before the
 * handler of each request that xterm.js answers. A focus listener runs
 * before its focus handler while focus reports are on, and marks the focus
 * report. All other data is the user's: keys, text, composed text, paste,
 * and mouse reports. A plain drag selects text also while a program has the
 * mouse. It reads the private messages of the terminal bridge, and keeps the
 * links that a program marks with OSC 8 as plain text. Create it after
 * `open()`, and write to xterm.js only through it.
 */
export class XtermScreen implements TerminalScreen {
  private readonly xterm: Terminal
  private readonly userListeners = new Set<Listener>()
  private readonly replyListeners = new Set<Listener>()
  private readonly focusListeners = new Set<Listener>()
  private readonly mouseListeners = new Set<MouseListener>()
  private readonly bridgeListeners = new Set<(event: BridgeEvent) => void>()
  private readonly bridge = new BridgeReader()
  private pasteHandler: ((text: string) => boolean) | null = null
  private readonly disposables: IDisposable[] = []
  /** From a request until xterm.js has parsed the chunk that holds it. */
  private replying = false
  /** During the focus handler of xterm.js, while focus reports are on. */
  private focusing = false

  constructor(xterm: Terminal) {
    this.xterm = xterm
    // A hook that returns false lets the handler of xterm.js answer next.
    const mark = () => {
      this.replying = true
      return false
    }
    const { parser } = xterm
    this.disposables.push(
      ...csiRequests.map((id) => parser.registerCsiHandler(id, mark)),
      ...dcsRequests.map((id) => parser.registerDcsHandler(id, mark)),
      ...oscRequests.map((id) => parser.registerOscHandler(id, mark)),
      parser.registerOscHandler(BRIDGE_OSC, (text) => {
        const event = this.bridge.read(text)
        if (event) for (const listener of this.bridgeListeners) listener(event)
        return true
      }),
      // The link of an OSC 8 stays plain text, as it was in the tmux screen.
      parser.registerOscHandler(8, () => true),
      xterm.onBinary((data) => {
        for (const listener of this.mouseListeners) listener(data, true)
      }),
      xterm.onData((data) => {
        if (!this.focusing && !this.replying && isSgrMouseReport(data)) {
          for (const listener of this.mouseListeners) listener(data, false)
          return
        }
        const listeners = this.focusing
          ? this.focusListeners
          : this.replying
            ? this.replyListeners
            : this.userListeners
        for (const listener of listeners) listener(data)
      }),
    )
    this.watchFocus()
    this.keepPlainDrags()
    this.watchPastes()
  }

  get cols(): number {
    return this.xterm.cols
  }

  get rows(): number {
    return this.xterm.rows
  }

  get modes(): Terminal['modes'] {
    return this.xterm.modes
  }

  /**
   * Writes output. xterm.js calls the callback directly after it parses the
   * chunk, in the same call, so a mark ends there and never reaches input that
   * comes later.
   */
  write(data: string): void {
    this.xterm.write(data, () => {
      this.replying = false
    })
  }

  onUserInput(listener: Listener): IDisposable {
    return subscribe(this.userListeners, listener)
  }

  onReply(listener: Listener): IDisposable {
    return subscribe(this.replyListeners, listener)
  }

  /** A focus report, which xterm.js sends while a program asked for it. */
  onFocusReport(listener: Listener): IDisposable {
    return subscribe(this.focusListeners, listener)
  }

  /**
   * A mouse report of the user. A binary one has one character for each
   * byte, and the transport cannot carry it as text.
   */
  onMouseReport(listener: MouseListener): IDisposable {
    this.mouseListeners.add(listener)
    return { dispose: () => this.mouseListeners.delete(listener) }
  }

  resize(cols: number, rows: number): void {
    if (this.xterm.cols !== cols || this.xterm.rows !== rows)
      this.xterm.resize(cols, rows)
  }

  /** A message of the terminal bridge, after its nonce check. */
  onBridge(listener: (event: BridgeEvent) => void): IDisposable {
    this.bridgeListeners.add(listener)
    return { dispose: () => this.bridgeListeners.delete(listener) }
  }

  /**
   * Takes over each paste of the user. A handler that returns false leaves
   * the paste to xterm.js.
   */
  setPasteHandler(handler: ((text: string) => boolean) | null): void {
    this.pasteHandler = handler
  }

  /** The text and the background colours, as the bridge accepts them. */
  colours(): { foreground: string; background: string } | null {
    const theme = this.xterm.options.theme
    const foreground = hexColour(theme?.foreground)
    const background = hexColour(theme?.background)
    return foreground && background ? { foreground, background } : null
  }

  onResize(
    listener: (size: { cols: number; rows: number }) => void,
  ): IDisposable {
    return this.xterm.onResize(listener)
  }

  focus(): void {
    this.xterm.focus()
  }

  /** Writes the reset of each mouse mode to xterm.js, never to the shell. */
  releaseMouse(): void {
    this.write(mouseModesOff)
  }

  dispose(): void {
    for (const disposable of this.disposables.splice(0)) disposable.dispose()
  }

  /**
   * xterm.js reports focus changes from its own listeners on its text area. A
   * capture listener on the terminal runs before them, and a listener that is
   * added after them on the text area runs after them.
   */
  private watchFocus(): void {
    const { element, textarea } = this.xterm
    if (!element || !textarea) return
    const before = (event: FocusEvent) => {
      if (event.target === textarea) {
        this.focusing = this.xterm.modes.sendFocusMode
      }
    }
    const after = () => {
      this.focusing = false
    }
    for (const type of ['focus', 'blur'] as const) {
      element.addEventListener(type, before, true)
      textarea.addEventListener(type, after)
    }
    this.disposables.push({
      dispose: () => {
        for (const type of ['focus', 'blur'] as const) {
          element.removeEventListener(type, before, true)
          textarea.removeEventListener(type, after)
        }
      },
    })
  }

  /** A capture listener runs before the paste listener of xterm.js. */
  private watchPastes(): void {
    const { element } = this.xterm
    if (!element) return
    const paste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain') ?? ''
      if (!this.pasteHandler || !text || !this.pasteHandler(text)) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    element.addEventListener('paste', paste, true)
    this.disposables.push({
      dispose: () => element.removeEventListener('paste', paste, true),
    })
  }

  /**
   * While a program has the mouse, a plain drag still selects text. The
   * program still gets the wheel, the other buttons, and each press with a
   * modifier.
   */
  private keepPlainDrags(): void {
    const { element } = this.xterm
    if (!element) return
    const stop = keepPlainPresses(
      element,
      () => this.xterm.modes.mouseTrackingMode !== 'none',
      forcedSelectionKey(navigator.platform),
    )
    this.disposables.push({ dispose: stop })
  }
}
