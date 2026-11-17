import type { TerminalSocket } from '../app/terminal-transport'
import type { FakeTerminal } from './fake-terminal'

/** A browser socket over the decoded fake shell, with ttyd input and output framing. */
export class FakeTerminalSocket extends EventTarget implements TerminalSocket {
  binaryType: BinaryType = 'blob'
  readyState = 0
  readonly terminalId: string
  readonly terminal: FakeTerminal
  private initialized = false
  private stopData: (() => void) | null = null
  private readonly stopClose: () => void

  constructor(terminalId: string, terminal: FakeTerminal) {
    super()
    this.terminalId = terminalId
    this.terminal = terminal
    // The Worker closes with 1011 when the sandbox side ends, and a drop of
    // the fake shell reaches the page with no close frame, as 1006.
    this.stopClose = terminal.onClose((end) =>
      this.close(end === 'lost' ? 1006 : 1011),
    )
    queueMicrotask(() => {
      if (this.readyState !== 0) return
      this.readyState = 1
      this.dispatchEvent(new Event('open'))
    })
  }

  send(data: string): void {
    if (this.readyState !== 1) throw new Error('The terminal socket is closed.')
    if (this.initialized && data.startsWith('0')) {
      this.terminal.write(data.slice(1))
      return
    }
    const size: unknown = JSON.parse(this.initialized ? data.slice(1) : data)
    if (
      typeof size !== 'object' ||
      size === null ||
      !('columns' in size) ||
      !('rows' in size) ||
      typeof size.columns !== 'number' ||
      typeof size.rows !== 'number'
    )
      throw new Error('The terminal size is not valid.')
    this.terminal.resize(size.columns, size.rows)
    if (this.initialized) return
    this.initialized = true
    this.stopData = this.terminal.onData((output) => {
      const bytes = new TextEncoder().encode(`0${output}`)
      this.dispatchEvent(
        new MessageEvent('message', {
          data:
            this.binaryType === 'arraybuffer'
              ? bytes.buffer
              : new Blob([bytes]),
        }),
      )
    })
  }

  /**
   * Ends the socket. Its close event carries `code`, as a browser socket
   * does: 1006 for a drop with no close frame, such as at a deploy.
   */
  close(code = 1000): void {
    if (this.readyState === 3) return
    this.readyState = 3
    this.stopData?.()
    this.stopClose()
    this.dispatchEvent(Object.assign(new Event('close'), { code }))
  }
}
