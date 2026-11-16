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
    this.stopClose = terminal.onClose(() => this.close())
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

  close(): void {
    if (this.readyState === 3) return
    this.readyState = 3
    this.stopData?.()
    this.stopClose()
    this.dispatchEvent(new Event('close'))
  }
}

/** Fetch has no native upgrade response in browsers or Node. The adapter stays in memory. */
export function fakeTerminalUpgrade(socket: FakeTerminalSocket): Response {
  const response = new Response(null, {
    headers: { 'Sec-WebSocket-Protocol': 'tty' },
  })
  Object.defineProperties(response, {
    status: { value: 101 },
    webSocket: { value: socket },
  })
  return response
}
