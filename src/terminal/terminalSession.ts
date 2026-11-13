import type { TerminalTransport } from '../shared/terminal'
import { bridgeInputMessage, type BridgeSize } from '../shared/terminal-bridge'
import { pasteMessage, type BridgeEvent } from './bridgeLink'
import { keySequence, withControl, type ExtraKey } from './terminalKeys'

interface Disposable {
  dispose(): void
}

/**
 * The screen of a session, such as an xterm.js terminal. It splits the data
 * that it sends by its source.
 */
export interface TerminalScreen {
  readonly cols: number
  readonly rows: number
  readonly modes: { readonly applicationCursorKeysMode: boolean }
  write(data: string): void
  /** The user's own input: keys, text, composition, paste, and mouse. */
  onUserInput(listener: (data: string) => void): Disposable
  /** Data that the screen sends by itself, such as a cursor report. */
  onReply(listener: (data: string) => void): Disposable
  /** A focus report, which the screen sends while a program asked for it. */
  onFocusReport(listener: (data: string) => void): Disposable
  /** A message of the terminal bridge, after its nonce check. */
  onBridge(listener: (event: BridgeEvent) => void): Disposable
  /** Takes over each paste. A handler that returns false leaves it. */
  setPasteHandler(handler: ((text: string) => boolean) | null): void
  /** The text and the background colours, as `#rrggbb`. */
  colours(): { foreground: string; background: string } | null
  onResize(listener: (size: { cols: number; rows: number }) => void): Disposable
  focus(): void
  /**
   * Turns off the mouse reports that a program turned on, in the screen
   * only, so that a drag selects text again. The program gets nothing.
   */
  releaseMouse(): void
}

export interface TerminalSessionEvents {
  /** The transport closed on its side, for example when the shell exits. */
  onClosed(): void
  /** The Ctrl key of the key row was held or released. */
  onControlChange(held: boolean): void
  /** The user typed or pressed a key of the key row. */
  onInput?(): void
  /** The terminal bridge gave the size that all viewers share. */
  onSharedSize?(size: BridgeSize): void
}

/** Colours for the bridge when the theme gives none as `#rrggbb`. */
const fallbackColours = { foreground: '#ffffff', background: '#000000' }

/**
 * Connects a terminal screen to a decoded terminal transport. Output goes to
 * the screen. The user's input, the keys of the key row, the screen's own
 * replies, and each new size go to the transport. A held Ctrl key applies to
 * the next key of the user only.
 *
 * When the terminal bridge says hello, the session answers with the colours
 * of the screen. From then on, tmux answers the requests of programs, so the
 * session drops the replies of the screen. It sends focus reports and
 * pastes as messages, and it acknowledges each mark of the bridge. The size
 * that it sends is the size of the panel, from `resizePanel`, because the
 * screen takes the shared size of the bridge.
 */
export class TerminalSession {
  private readonly screen: TerminalScreen
  private readonly transport: TerminalTransport
  private readonly events: TerminalSessionEvents
  private readonly cleanups: (() => void)[] = []
  private control = false
  private ended = false
  /** The nonce of the bridge, after its hello. */
  private nonce: string | null = null
  /** The last panel size that the session sent. */
  private panel = ''

  constructor(
    screen: TerminalScreen,
    transport: TerminalTransport,
    events: TerminalSessionEvents,
  ) {
    this.screen = screen
    this.transport = transport
    this.events = events
  }

  /** Subscribes both sides, then sends the current size of the screen. */
  start(): void {
    const { screen, transport } = this
    this.cleanups.push(
      transport.onData((output) => screen.write(output)),
      transport.onClose(() => {
        this.ended = true
        // The program is gone, so its output stays selectable.
        screen.releaseMouse()
        this.events.onClosed()
      }),
    )
    const input = screen.onUserInput((data) =>
      this.send(this.control ? withControl(data) : data),
    )
    // A reply is not the user's key: it keeps a held Ctrl and is no activity.
    const reply = screen.onReply((data) => {
      if (!this.ended && !this.nonce) transport.write(data)
    })
    const focus = screen.onFocusReport((data) => this.focusReport(data))
    const bridge = screen.onBridge((event) => this.bridgeEvent(event))
    const resize = screen.onResize(({ cols, rows }) => {
      if (!this.ended && !this.nonce) transport.resize(cols, rows)
    })
    this.cleanups.push(
      () => input.dispose(),
      () => reply.dispose(),
      () => focus.dispose(),
      () => bridge.dispose(),
      () => resize.dispose(),
      () => screen.setPasteHandler(null),
    )
    transport.resize(screen.cols, screen.rows)
  }

  /** Sends the size of the panel, which the bridge gives to the window. */
  resizePanel(cols: number, rows: number): void {
    const panel = `${cols}x${rows}`
    if (this.ended || !this.nonce || panel === this.panel) return
    this.panel = panel
    this.transport.resize(cols, rows)
  }

  /** Sends one key of the key row, and keeps the keyboard on the terminal. */
  pressKey(key: ExtraKey): void {
    const applicationCursor = this.screen.modes.applicationCursorKeysMode
    this.send(keySequence(key, { control: this.control, applicationCursor }))
    this.screen.focus()
  }

  /** Holds or releases Ctrl for the next key. */
  toggleControl(): void {
    this.setControl(!this.control)
    this.screen.focus()
  }

  /** Stops both subscriptions, then closes the transport. */
  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    if (this.ended) return
    this.ended = true
    this.transport.close()
  }

  private bridgeEvent(event: BridgeEvent): void {
    if (this.ended) return
    if (event.kind === 'hello') {
      const nonce = event.nonce
      this.nonce = nonce
      const colours = this.screen.colours() ?? fallbackColours
      this.transport.write(
        bridgeInputMessage(nonce, { kind: 'hello', ...colours }),
      )
      this.screen.setPasteHandler((text) => this.paste(nonce, text))
      this.events.onSharedSize?.(event.size)
    } else if (event.kind === 'size') {
      this.events.onSharedSize?.(event.size)
    } else if (this.nonce) {
      const ack = { kind: 'ack', mark: event.mark } as const
      this.transport.write(bridgeInputMessage(this.nonce, ack))
    }
  }

  /** A focus report is not the user's key either, as a reply is not. */
  private focusReport(data: string): void {
    if (this.ended) return
    if (!this.nonce) {
      this.transport.write(data)
      return
    }
    const focused = data === '\x1b[I'
    if (!focused && data !== '\x1b[O') return
    const message = { kind: 'focus', focused } as const
    this.transport.write(bridgeInputMessage(this.nonce, message))
  }

  private paste(nonce: string, text: string): boolean {
    const message = pasteMessage(nonce, text)
    if (this.ended || !message) return false
    this.setControl(false)
    this.transport.write(message)
    this.events.onInput?.()
    return true
  }

  private send(data: string): void {
    this.setControl(false)
    if (this.ended) return
    this.transport.write(data)
    this.events.onInput?.()
  }

  private setControl(held: boolean): void {
    if (this.control === held) return
    this.control = held
    this.events.onControlChange(held)
  }
}
