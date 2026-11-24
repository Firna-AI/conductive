import { expect, it } from 'vitest'

import {
  HOST_STREAM_FRAME_BYTES,
  HOST_STREAM_WINDOW_BYTES,
} from '../../src/shared/host'
import { encodeHostFrame } from '../../src/shared/host-frames'
import { setupMachines } from './host.test-support'
import { number } from '../chat/inputs'

const fixture = setupMachines()

it('opens each fixed port, enforces outbound credit, returns receive credit, and half closes', async () => {
  const f = await fixture()
  const host = await f.open()
  const opening = f.client.openStream(7681)
  expect(await host.reply({ kind: 'stream.opened', streamId: 1 })).toEqual({
    kind: 'stream.open',
    streamId: 1,
    port: 7681,
  })
  const stream = await opening
  const reader = stream.readable.getReader()
  const writer = stream.writable.getWriter()
  const read = reader.read()
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'streamData',
        streamId: 1,
        data: new Uint8Array([1, 2, 3]),
      }),
    ),
  )
  expect(await read).toEqual({ done: false, value: new Uint8Array([1, 2, 3]) })
  host.send({ type: 'ping' })
  expect(await host.inbox.next()).toEqual({ type: 'pong' })
  const rest = reader.read()
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'streamData',
        streamId: 1,
        data: new Uint8Array(HOST_STREAM_FRAME_BYTES - 3).fill(4),
      }),
    ),
  )
  const remaining = new Uint8Array(HOST_STREAM_FRAME_BYTES - 3)
  let chunk = await rest
  let offset = 0
  while (offset < remaining.byteLength) {
    if (chunk.done) throw new Error('The stream ended before the frame.')
    remaining.set(chunk.value, offset)
    offset += chunk.value.byteLength
    if (offset < remaining.byteLength) chunk = await reader.read()
  }
  expect(remaining).toEqual(new Uint8Array(HOST_STREAM_FRAME_BYTES - 3).fill(4))
  expect(await host.inbox.next()).toEqual({
    type: 'stream.credit',
    streamId: 1,
    bytes: 65_536,
  })
  let completed = false
  const write = writer
    .write(new Uint8Array(HOST_STREAM_WINDOW_BYTES + 1).fill(9))
    .then(() => {
      completed = true
    })
  for (let index = 0; index < 4; index++) {
    const frame = await host.inbox.next()
    expect(frame).toMatchObject({
      kind: 'streamData',
      streamId: 1,
      data: new Uint8Array(HOST_STREAM_FRAME_BYTES).fill(9),
    })
  }
  host.send({ type: 'ping' })
  expect(await host.inbox.next()).toEqual({ type: 'pong' })
  expect(completed).toBe(false)
  host.send({ type: 'stream.credit', streamId: 1, bytes: 1 })
  expect(await host.inbox.next()).toEqual({
    kind: 'streamData',
    streamId: 1,
    data: new Uint8Array([9]),
  })
  await write
  await writer.close()
  expect(await host.inbox.next()).toEqual({ type: 'stream.end', streamId: 1 })
  host.send({ type: 'stream.end', streamId: 1 })
  expect(await reader.read()).toEqual({ done: true, value: undefined })
  const relay = f.client.openStream(7682)
  const request = await host.inbox.request()
  const streamId = number(request.operation.streamId)
  expect(request.operation).toEqual({
    kind: 'stream.open',
    streamId,
    port: 7682,
  })
  host.send({
    type: 'reply',
    requestId: request.requestId,
    result: { kind: 'stream.opened', streamId },
  })
  await (await relay).writable.abort()
  expect(await host.inbox.next()).toEqual({ type: 'stream.close', streamId })
  const namespace = f.env.MACHINES
  if (!namespace) throw new Error('No machine binding.')
  const stub = namespace.getByName(f.name)
  const invalid: unknown = await Reflect.apply(stub.openStream, stub, [
    f.owner,
    7683,
  ])
  expect(invalid).toMatchObject({
    ok: false,
    error: { status: 400, code: 'invalid_request' },
  })
})

it('closes a stream at the peer request and rejects unknown stream data', async () => {
  const f = await fixture()
  const host = await f.open()
  const opening = f.client.openStream(7681)
  await host.reply({ kind: 'stream.opened', streamId: 1 })
  const stream = await opening
  host.send({ type: 'stream.close', streamId: 1 })
  await expect(stream.readable.getReader().read()).rejects.toThrow(
    'ReadableStream received over RPC disconnected',
  )
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'streamData',
        streamId: 999,
        data: new Uint8Array([1]),
      }),
    ),
  )
  host.send({ type: 'ping' })
  expect(await host.inbox.next()).toEqual({ type: 'pong' })
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'streamData',
        streamId: 1,
        data: new Uint8Array([1]),
      }),
    ),
  )
  expect(await host.inbox.next()).toEqual({
    type: 'stream.close',
    streamId: 1,
  })
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'streamData',
        streamId: 1,
        data: new Uint8Array([1]),
      }),
    ),
  )
  host.send({ type: 'ping' })
  expect(await host.inbox.next()).toEqual({ type: 'pong' })
})

it('fails both stream directions on a drop and bounds the open stream count', async () => {
  const f = await fixture()
  const host = await f.open()
  const streams = []
  for (let index = 1; index <= 64; index++) {
    const call = f.client.openStream(7681)
    const request = await host.inbox.request()
    host.send({
      type: 'reply',
      requestId: request.requestId,
      result: {
        kind: 'stream.opened',
        streamId: number(request.operation.streamId),
      },
    })
    streams.push(await call)
  }
  await expect(f.client.openStream(7681)).rejects.toMatchObject({
    status: 503,
    code: 'machine_busy',
  })
  const read = streams[0].readable.getReader().read()
  const readFailure = expect(read).rejects.toThrow(
    'ReadableStream received over RPC disconnected',
  )
  const writer = streams[0].writable.getWriter()
  const writeFailure = expect(
    writer.write(new Uint8Array(HOST_STREAM_WINDOW_BYTES + 1)),
  ).rejects.toThrow('The cloud computer connection dropped. Try again.')
  for (let index = 0; index < 4; index++) await host.inbox.next()
  host.socket.close()
  await readFailure
  await writeFailure
  expect(await host.closed).toBe(1000)
  expect((await f.client.connection()).connected).toBe(false)
})
