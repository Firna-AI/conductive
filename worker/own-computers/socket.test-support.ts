import type { WebSocket } from 'miniflare'

import type { ComputerToWorker } from '../../src/shared/generated/ComputerToWorker'
import { decodeHostFrame, encodeHostFrame } from '../../src/shared/host-frames'
import { isRecord } from '../http'

export class FakeComputer {
  private readonly messages: (string | ArrayBuffer)[] = []
  private readonly readers: ((value: string | ArrayBuffer) => void)[] = []
  readonly closed: Promise<number>
  readonly socket: WebSocket

  constructor(socket: WebSocket) {
    this.socket = socket
    this.closed = new Promise((resolve) => {
      socket.addEventListener(
        'close',
        (event) => {
          if (socket.readyState !== 3) socket.close()
          resolve(event.code)
        },
        { once: true },
      )
    })
    socket.addEventListener('message', ({ data }) => {
      if (typeof data !== 'string' && !(data instanceof ArrayBuffer))
        throw new Error('Expected WebSocket text or binary.')
      const reader = this.readers.shift()
      if (reader) reader(data)
      else this.messages.push(data)
    })
    socket.accept()
  }

  async next(): Promise<unknown> {
    const value = await this.raw()
    if (typeof value !== 'string') throw new Error('Expected WebSocket text.')
    return JSON.parse(value)
  }

  send(message: ComputerToWorker) {
    this.socket.send(JSON.stringify(message))
  }

  sendPart(requestId: number, data: Uint8Array, last: boolean) {
    this.socket.send(
      new Uint8Array(
        encodeHostFrame({ kind: 'messagePart', requestId, data, last }),
      ),
    )
  }

  async request() {
    const first = await this.raw()
    if (typeof first === 'string') return { ...readRequest(first), parts: 0 }

    const parts: Uint8Array[] = []
    let frame = decodeHostFrame(new Uint8Array(first))
    for (;;) {
      if (frame.kind !== 'messagePart')
        throw new Error('Expected a message part.')
      parts.push(frame.data)
      if (frame.last) {
        const bytes = await new Blob(parts).arrayBuffer()
        const request = readRequest(
          new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(
            bytes,
          ),
        )
        if (request.requestId !== frame.requestId)
          throw new Error('Unexpected message part ID.')
        return { ...request, parts: parts.length }
      }
      const next = await this.raw()
      if (typeof next === 'string') throw new Error('Expected a binary frame.')
      frame = decodeHostFrame(new Uint8Array(next))
    }
  }

  private raw(): Promise<string | ArrayBuffer> {
    const message = this.messages.shift()
    return message === undefined
      ? new Promise((resolve) => this.readers.push(resolve))
      : Promise.resolve(message)
  }
}

function readRequest(text: string) {
  const message: unknown = JSON.parse(text)
  if (
    !isRecord(message) ||
    message.type !== 'request' ||
    typeof message.requestId !== 'number'
  )
    throw new Error('Expected a computer request.')
  return { requestId: message.requestId, operation: message.operation }
}
