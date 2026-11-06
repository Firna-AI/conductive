import { WebSocket } from 'miniflare'

export class SocketInbox {
  private readonly values: unknown[] = []
  private readonly readers: ((value: unknown) => void)[] = []

  constructor(socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string')
        throw new Error('Expected a text socket message.')
      const value: unknown = JSON.parse(event.data)
      const reader = this.readers.shift()
      if (reader) reader(value)
      else this.values.push(value)
    })
  }

  next(): Promise<unknown> {
    if (this.values.length) return Promise.resolve(this.values.shift())
    return new Promise((resolve) => this.readers.push(resolve))
  }
}

/** Close readiness, rather than close initiation, permits real object eviction. */
export async function closeSockets(...sockets: WebSocket[]): Promise<void> {
  await Promise.all(
    sockets.map((socket) => {
      if (socket.readyState === WebSocket.READY_STATE_CLOSED)
        return Promise.resolve()
      return new Promise<void>((resolve) => {
        socket.addEventListener('close', () => resolve(), { once: true })
        socket.close(1000, 'The test has finished using this connection.')
      })
    }),
  )
}
