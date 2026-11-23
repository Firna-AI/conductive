import type { WebSocket } from 'miniflare'
import { afterAll, afterEach, beforeAll } from 'vitest'

import type { HostResult } from '../../src/shared/generated/HostResult'
import type { HostToWorker } from '../../src/shared/generated/HostToWorker'
import { HOST_MESSAGE_PART_BYTES, HOST_PATH } from '../../src/shared/host'
import { decodeHostFrame, encodeHostFrame } from '../../src/shared/host-frames'
import { number, record } from '../chat/inputs'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
  OUTER_MACHINE_ORIGIN,
} from '../chat/integration/outer-runtime.test-support'
import { workspaceMachineOwner } from './client'
import { testMachineClient } from './client.test-support'
import type { Machine } from './machine'
import { machineObjectName } from './identity'

class HostInbox {
  private values: (string | ArrayBuffer)[] = []
  private readers: ((value: string | ArrayBuffer) => void)[] = []
  constructor(socket: WebSocket) {
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

export function setupMachines() {
  let outer: Awaited<ReturnType<typeof createOuterRuntime>>
  const sockets: WebSocket[] = []
  let sequence = 0
  beforeAll(async () => {
    outer = await createOuterRuntime(
      await outerWorkerBundle('worker/machines/entry.test-support.ts'),
      { machineProbe: true },
    )
    const bindings = await outer.runtime.getBindings<{
      MACHINES: DurableObjectNamespace<Machine>
    }>()
    outer.env.MACHINES = bindings.MACHINES
  })
  afterEach(async () => {
    await closeSockets(...sockets)
    sockets.length = 0
  })
  afterAll(async () => {
    await outer.dispose()
  })
  return async () => {
    const owner = workspaceMachineOwner('org', `host-test-${++sequence}`)
    const client = testMachineClient(outer, owner)
    const token = await client.token()
    const connect = async (
      credential = token,
      headers: Record<string, string> = {},
    ) =>
      outer.runtime.dispatchFetch(OUTER_MACHINE_ORIGIN + HOST_PATH, {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${credential}`,
          ...headers,
        },
      })
    const open = async (credential = token, hello = true) => {
      const response = await connect(credential)
      const socket = response.webSocket
      if (!socket)
        throw new Error(
          `Host returned ${response.status}: ${await response.text()}`,
        )
      sockets.push(socket)
      const inbox = new HostInbox(socket)
      const closed = new Promise<number>((resolve) =>
        socket.addEventListener(
          'close',
          (event) => {
            if (socket.readyState !== 3) socket.close()
            resolve(event.code)
          },
          { once: true },
        ),
      )
      socket.accept()
      const send = (value: HostToWorker) => socket.send(JSON.stringify(value))
      if (hello) {
        send({
          type: 'hello',
          hostProtocolVersion: 1,
          programVersion: 'test-release',
        })
        const welcome = await inbox.next()
        if (record(welcome).type !== 'welcome')
          throw new Error('Expected host welcome.')
      }
      return {
        socket,
        inbox,
        closed,
        send,
        reply: async (result: HostResult) => {
          const request = await inbox.request()
          send({ type: 'reply', requestId: request.requestId, result })
          return request.operation
        },
        parts: (
          requestId: number,
          bytes: Uint8Array,
          split = HOST_MESSAGE_PART_BYTES,
        ) => {
          for (let offset = 0; offset < bytes.byteLength; offset += split)
            socket.send(
              new Uint8Array(
                encodeHostFrame({
                  kind: 'messagePart',
                  requestId,
                  last: offset + split >= bytes.byteLength,
                  data: bytes.subarray(offset, offset + split),
                }),
              ),
            )
        },
      }
    }
    return {
      ...outer,
      owner,
      name: machineObjectName(owner),
      token,
      client,
      connect,
      open,
    }
  }
}
