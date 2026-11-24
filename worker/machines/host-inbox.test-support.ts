import { decodeHostFrame } from '../../src/shared/host-frames'
import { number, record } from '../chat/inputs'

interface HostTestSocket {
  addEventListener(
    type: 'message',
    listener: (event: { data: unknown }) => void,
  ): void
}

export class HostInbox {
  private values: (string | ArrayBuffer)[] = []
  private readers: ((value: string | ArrayBuffer) => void)[] = []
  constructor(socket: HostTestSocket) {
    socket.addEventListener('message', (event) => {
      const value = event.data
      if (typeof value !== 'string' && !(value instanceof ArrayBuffer))
        throw new Error('Invalid test socket frame.')
      const reader = this.readers.shift()
      if (reader) reader(value)
      else this.values.push(value)
    })
  }
  async raw(): Promise<string | ArrayBuffer> {
    const value = this.values.shift()
    return value ?? new Promise((resolve) => this.readers.push(resolve))
  }
  async next(): Promise<unknown> {
    const value = await this.raw()
    return typeof value === 'string'
      ? JSON.parse(value)
      : decodeHostFrame(new Uint8Array(value))
  }
  async request() {
    const first = await this.raw()
    let value: unknown
    if (typeof first === 'string') value = JSON.parse(first)
    else {
      const parts: Uint8Array[] = []
      let data = first
      for (;;) {
        const frame = decodeHostFrame(new Uint8Array(data))
        if (frame.kind !== 'messagePart')
          throw new Error('Expected request parts.')
        parts.push(frame.data)
        if (frame.last) break
        const next = await this.raw()
        if (typeof next === 'string')
          throw new Error('Expected binary request part.')
        data = next
      }
      value = JSON.parse(
        new TextDecoder().decode(await new Blob(parts).arrayBuffer()),
      )
    }
    const message = record(value)
    return {
      requestId: number(message.requestId),
      operation: record(message.operation),
    }
  }
}
