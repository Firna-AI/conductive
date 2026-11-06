import type { IDisposable, IFunctionIdentifier, Terminal } from '@xterm/xterm'
import type { TerminalScreen } from './terminalSession'

type Listener = (data: string) => void

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

function subscribe(listeners: Set<Listener>, listener: Listener): IDisposable {
  listeners.add(listener)
  return { dispose: () => listeners.delete(listener) }
}

/**
 * The xterm.js terminal of a session, with its data split by source. Each of
 * its own replies is marked where it starts: a parser hook runs before the
 * handler of each request that xterm.js answers, and a focus listener runs
 * before its focus handler while focus reports are on. All other data is the
 * user's: keys, text, composed text, paste, and mouse reports. Create it after
 * `open()`, and write to xterm.js only through it.
 */
export class XtermScreen implements TerminalScreen {
  private readonly xterm: Terminal
  private readonly userListeners = new Set<Listener>()
  private readonly replyListeners = new Set<Listener>()
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
      xterm.onData((data) => {
        const reply = this.replying || this.focusing
        const listeners = reply ? this.replyListeners : this.userListeners
        for (const listener of listeners) listener(data)
      }),
    )
    this.watchFocus()
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

  onResize(
    listener: (size: { cols: number; rows: number }) => void,
  ): IDisposable {
    return this.xterm.onResize(listener)
  }

  focus(): void {
    this.xterm.focus()
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
}
