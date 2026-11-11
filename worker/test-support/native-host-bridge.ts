import { AsyncLocalStorage } from 'node:async_hooks'

import { Response as RuntimeResponse } from 'miniflare'

import { nativePacket, readNativePacket } from './native-protocol'
import {
  NativeValues,
  type NativeInvocation,
  type NativeRemote,
  type NativeResult,
} from './native-values'

export class NativeHostBridge {
  private sequence = 0
  private readonly replies = new Map<string, (result: NativeResult) => void>()
  private readonly streams = new Set<
    ReadableStreamDefaultController<Uint8Array>
  >()
  readonly values: NativeValues
  private readonly active = new AsyncLocalStorage<
    (invocation: NativeInvocation) => Promise<unknown>
  >()
  private readonly controlCalls = new Set<
    (invocation: NativeInvocation) => Promise<unknown>
  >()

  constructor(invoke: (invocation: NativeInvocation) => Promise<NativeResult>) {
    this.values = new NativeValues('node', async (invocation) => {
      // Configuration can enter a held callback. A queue drain must use
      // its own request, so that it cannot wait for its current callback.
      const active =
        this.active.getStore() ??
        (invocation.reference.path[0] === 'controls' &&
        invocation.reference.path[1] === 'configure'
          ? [...this.controlCalls].at(-1)
          : undefined)
      return active
        ? active(invocation)
        : this.values.result(await invoke(invocation))
    })
  }

  remote<T extends object>(): NativeRemote<T> {
    // The runtime exports the typed test API at this reference.
    return this.values.remote({
      type: 'reference',
      owner: 'worker',
      id: 'root',
      path: [],
    }) as NativeRemote<T>
  }

  async fetch(request: { url: string; json(): Promise<unknown> }) {
    const packet = readNativePacket(await request.json())
    if (packet.type === 'result') {
      const resolve = this.replies.get(packet.id)
      if (!resolve) throw new Error(`Unknown native reply: ${packet.id}`)
      this.replies.delete(packet.id)
      resolve(packet.result)
      return new RuntimeResponse(null, { status: 204 })
    }
    if (packet.type !== 'call') throw new Error('Expected a native callback.')
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start: (stream) => {
        this.streams.add(stream)
        const call = (invocation: NativeInvocation) =>
          new Promise((resolve, reject) => {
            const id = `reply-${++this.sequence}`
            this.replies.set(id, (result) => {
              try {
                resolve(values.result(result))
              } catch (error) {
                reject(error)
              }
            })
            stream.enqueue(nativePacket({ type: 'call', id, invocation }))
          })
        const values = this.values.fork(call)
        this.controlCalls.add(call)
        stream.enqueue(encoder.encode('\n'))
        void this.active
          .run(call, () => values.invoke(packet.invocation))
          .then((result) => {
            this.controlCalls.delete(call)
            if (!this.streams.delete(stream)) return
            stream.enqueue(nativePacket({ type: 'done', result }))
            stream.close()
          })
      },
    })
    return new RuntimeResponse(body, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
  }

  cancel(): void {
    for (const stream of this.streams) {
      stream.enqueue(
        nativePacket({
          type: 'done',
          result: {
            ok: false,
            message: 'The native object was evicted.',
            name: 'Error',
            properties: { type: 'object', value: {} },
            thrown: { type: 'undefined' },
          },
        }),
      )
      stream.close()
    }
    this.streams.clear()
    this.controlCalls.clear()
  }
}
