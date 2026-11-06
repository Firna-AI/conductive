import type { TerminalTransport } from '../shared/terminal'
import { keySequence, withControl, type ExtraKey } from './terminalKeys'

interface Disposable {
  dispose(): void
}

/** The part of an xterm.js terminal that a session uses. */
export interface TerminalScreen {
  readonly cols: number
  readonly rows: number
  readonly modes: { readonly applicationCursorKeysMode: boolean }
  write(data: string): void
  onData(listener: (data: string) => void): Disposable
  onResize(listener: (size: { cols: number; rows: number }) => void): Disposable
  focus(): void
}

export interface TerminalSessionEvents {
  /** The transport closed on its side, for example when the shell exits. */
  onClosed(): void
  /** The Ctrl key of the key row was held or released. */
  onControlChange(held: boolean): void
  /** The user typed or pressed a key of the key row. */
  onInput?(): void
}

/**
 * Connects a terminal screen to a decoded terminal transport. Output goes to
 * the screen. Typed input, the keys of the key row, and each new size go to
 * the transport. A held Ctrl key applies to the next key only.
 */
export class TerminalSession {
  private readonly screen: TerminalScreen
  private readonly transport: TerminalTransport
  private readonly events: TerminalSessionEvents
  private readonly cleanups: (() => void)[] = []
  private control = false
  private ended = false

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
        this.events.onClosed()
      }),
    )
    const input = screen.onData((data) =>
      this.send(this.control ? withControl(data) : data),
    )
    const resize = screen.onResize(({ cols, rows }) => {
      if (!this.ended) transport.resize(cols, rows)
    })
    this.cleanups.push(
      () => input.dispose(),
      () => resize.dispose(),
    )
    transport.resize(screen.cols, screen.rows)
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
