import type { TerminalEnd, TerminalTransport } from '../shared/terminal'
import type { ReadyTerminal } from '../terminal/terminalApi'

type SocketEvent = 'open' | 'message' | 'close' | 'error'

export interface TerminalSocket {
  binaryType: BinaryType
  readonly readyState: number
  send(data: string): void
  close(): void
  addEventListener(type: SocketEvent, listener: EventListener): void
  removeEventListener(type: SocketEvent, listener: EventListener): void
}

export type OpenTerminalSocket = (
  socketPath: string,
  protocol: 'tty',
) => TerminalSocket

/**
 * The close codes of a lost connection. The Worker sends a close frame when
 * the sandbox side ends, such as when the shell exits. A connection that
 * drops with no close frame, such as at a restart of the Worker's Durable
 * Object or a network failure, reaches the page as 1006. 1001 and 1012 say
 * that the server goes away or restarts.
 */
const LOST_CODES: ReadonlySet<number> = new Set([1001, 1006, 1012])

/** The `readyState` of a socket that waits for its close event. */
const CLOSING = 2

function closeEnd(event: Event): TerminalEnd {
  const code = 'code' in event ? event.code : undefined
  return typeof code !== 'number' || LOST_CODES.has(code) ? 'lost' : 'closed'
}

/** The opener owns the configured origin. The codec owns only ttyd framing. */
export function createTerminalConnector(
  open: OpenTerminalSocket,
): (terminal: ReadyTerminal) => TerminalTransport {
  return (terminal) =>
    new TtydTransport(open(terminal.socketPath, terminal.protocol))
}

class TtydTransport implements TerminalTransport {
  private readonly socket: TerminalSocket
  private readonly decoder = new TextDecoder('utf-8', { ignoreBOM: true })
  private readonly encoder = new TextEncoder()
  private readonly dataListeners = new Set<(output: string) => void>()
  private readonly closeListeners = new Set<(end: TerminalEnd) => void>()
  private readonly pending: string[] = []
  private size: { columns: number; rows: number } | null = null
  private initialized = false
  private ended = false
  /** How the connection ended, once it ended. */
  private end: TerminalEnd = 'closed'

  constructor(socket: TerminalSocket) {
    this.socket = socket
    socket.binaryType = 'arraybuffer'
    socket.addEventListener('open', this.opened)
    socket.addEventListener('message', this.message)
    socket.addEventListener('close', this.peerClosed)
    socket.addEventListener('error', this.failed)
    this.flush()
  }

  write(input: string): void {
    if (this.ended) return
    this.pending.push(`0${input}`)
    this.flush()
  }

  resize(columns: number, rows: number): void {
    if (this.ended) return
    this.size = { columns, rows }
    if (this.initialized) this.send(`1${JSON.stringify(this.size)}`)
    else this.flush()
  }

  onData(listener: (output: string) => void): () => void {
    if (this.ended) return () => {}
    this.dataListeners.add(listener)
    return () => {
      this.dataListeners.delete(listener)
    }
  }

  onClose(listener: (end: TerminalEnd) => void): () => void {
    if (this.ended) {
      listener(this.end)
      return () => {}
    }
    this.closeListeners.add(listener)
    return () => {
      this.closeListeners.delete(listener)
    }
  }

  close(): void {
    this.finish(true, 'closed')
  }

  private readonly opened = () => this.flush()
  private readonly peerClosed = (event: Event) =>
    this.finish(false, closeEnd(event))
  private readonly failed = () => this.finish(true, 'lost')
  private readonly message: EventListener = (event) => {
    if (this.ended || !('data' in event)) return
    const bytes =
      typeof event.data === 'string'
        ? this.encoder.encode(event.data)
        : event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : null
    if (!bytes || bytes[0] !== 48) return
    this.emit(this.decoder.decode(bytes.subarray(1), { stream: true }))
  }

  private emit(output: string): void {
    if (!output) return
    for (const listener of [...this.dataListeners]) listener(output)
  }

  private flush(): void {
    if (this.ended) return
    // A closing socket drops its data. Its close event says how it ended.
    if (this.socket.readyState === CLOSING) {
      this.pending.length = 0
      return
    }
    if (this.socket.readyState > CLOSING) {
      this.finish(false, 'lost')
      return
    }
    if (this.socket.readyState !== 1 || this.size === null) return
    if (!this.initialized) {
      this.initialized = true
      if (!this.send(JSON.stringify(this.size))) return
    }
    for (const frame of this.pending.splice(0)) {
      if (!this.send(frame)) break
    }
  }

  private send(data: string): boolean {
    if (this.ended) return false
    if (this.socket.readyState === CLOSING) return false
    if (this.socket.readyState !== 1) {
      this.finish(false, 'lost')
      return false
    }
    try {
      this.socket.send(data)
      return true
    } catch {
      this.finish(true, 'lost')
      return false
    }
  }

  private finish(closeSocket: boolean, end: TerminalEnd): void {
    if (this.ended) return
    this.ended = true
    this.end = end
    this.pending.length = 0
    this.socket.removeEventListener('open', this.opened)
    this.socket.removeEventListener('message', this.message)
    this.socket.removeEventListener('close', this.peerClosed)
    this.socket.removeEventListener('error', this.failed)
    if (closeSocket) {
      try {
        this.socket.close()
      } catch {
        /* The connection already ended. */
      }
    }
    this.emit(this.decoder.decode())
    this.dataListeners.clear()
    const listeners = [...this.closeListeners]
    this.closeListeners.clear()
    for (const listener of listeners) listener(end)
  }
}
