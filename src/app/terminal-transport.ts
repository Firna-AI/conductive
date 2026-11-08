import type { TerminalTransport } from '../shared/terminal'
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
  private readonly closeListeners = new Set<() => void>()
  private readonly pending: string[] = []
  private size: { columns: number; rows: number } | null = null
  private initialized = false
  private ended = false

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

  onClose(listener: () => void): () => void {
    if (this.ended) {
      listener()
      return () => {}
    }
    this.closeListeners.add(listener)
    return () => {
      this.closeListeners.delete(listener)
    }
  }

  close(): void {
    this.finish(true)
  }

  private readonly opened = () => this.flush()
  private readonly peerClosed = () => this.finish(false)
  private readonly failed = () => this.finish(true)
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
    if (this.socket.readyState >= 2) {
      this.finish(false)
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
    if (this.socket.readyState !== 1) {
      this.finish(false)
      return false
    }
    try {
      this.socket.send(data)
      return true
    } catch {
      this.finish(true)
      return false
    }
  }

  private finish(closeSocket: boolean): void {
    if (this.ended) return
    this.ended = true
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
    for (const listener of listeners) listener()
  }
}
