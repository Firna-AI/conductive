import { expect, it } from 'vitest'

import type { WorkerToHost } from '../../src/shared/generated/WorkerToHost'
import {
  HOST_STREAM_FRAME_BYTES,
  HOST_STREAM_WINDOW_BYTES,
} from '../../src/shared/host'
import { HostStream } from './stream'

it('keeps unread one-byte frames in a byte-bounded number of blocks', async () => {
  const stream = new HostStream(
    6,
    () => {},
    () => {},
  )
  try {
    for (let index = 0; index < 100_000; index++)
      stream.data(new Uint8Array([3]))
    expect(stream.bufferedBlocks).toBe(2)
    const reader = stream.pair.readable.getReader()
    const received = new Uint8Array(100_000)
    let offset = 0
    while (offset < received.byteLength) {
      const chunk = await reader.read()
      if (chunk.done) throw new Error('The stream ended before its data.')
      received.set(chunk.value, offset)
      offset += chunk.value.byteLength
    }
    expect(received).toEqual(new Uint8Array(100_000).fill(3))
    expect(stream.bufferedBlocks).toBe(0)
  } finally {
    stream.close(false)
  }
})

it('grants credit by delivered bytes when each host frame holds one byte', async () => {
  const grants: number[] = []
  const stream = new HostStream(
    7,
    (message) => {
      if (!(message instanceof Uint8Array) && message.type === 'stream.credit')
        grants.push(message.bytes)
    },
    () => {},
  )
  try {
    const reader = stream.pair.readable.getReader()
    for (let index = 0; index < 131_089; index++) {
      const read = reader.read()
      stream.data(new Uint8Array([9]))
      const chunk = await read
      if (chunk.done || chunk.value.byteLength !== 1 || chunk.value[0] !== 9)
        throw new Error('The stream did not deliver the host byte.')
    }
    expect(grants.length).toBe(2)
    expect(grants).toEqual([65_536, 65_536])
    const larger = reader.read()
    stream.data(new Uint8Array(HOST_STREAM_FRAME_BYTES).fill(4))
    expect(await larger).toEqual({
      done: false,
      value: new Uint8Array(HOST_STREAM_FRAME_BYTES).fill(4),
    })
    expect(grants).toEqual([65_536, 65_536, 65_553])
  } finally {
    stream.close(false)
  }
})

it('closes an unread stream at receive-credit overflow and errors both directions', async () => {
  const sent: (WorkerToHost | Uint8Array)[] = []
  let removed = 0
  const stream = new HostStream(
    4,
    (message) => sent.push(message),
    () => {
      removed++
    },
  )
  for (let index = 0; index < 5; index++)
    stream.data(new Uint8Array(HOST_STREAM_FRAME_BYTES))
  expect(sent).toEqual([{ type: 'stream.close', streamId: 4 }])
  expect(removed).toBe(1)
  await expect(stream.pair.readable.getReader().read()).rejects.toMatchObject({
    code: 'machine_disconnected',
  })
  await expect(
    stream.pair.writable.getWriter().write(new Uint8Array([1])),
  ).rejects.toMatchObject({ code: 'machine_disconnected' })
})

it('cleans up a pending read and a blocked write when the close send throws', async () => {
  let frameCount = 0
  let windowSent = () => {}
  const sentWindow = new Promise<void>((resolve) => {
    windowSent = resolve
  })
  let removed = 0
  const stream = new HostStream(
    5,
    (message) => {
      if (message instanceof Uint8Array) {
        if (++frameCount === 4) windowSent()
      } else if (message.type === 'stream.close')
        throw new Error('The socket is closed.')
    },
    () => {
      removed++
    },
  )
  const reader = stream.pair.readable.getReader()
  const writer = stream.pair.writable.getWriter()
  const failedRead = expect(reader.read()).rejects.toMatchObject({
    code: 'machine_disconnected',
  })
  const failedWrite = expect(
    writer.write(new Uint8Array(HOST_STREAM_WINDOW_BYTES + 1)),
  ).rejects.toMatchObject({ code: 'machine_disconnected' })
  await sentWindow
  expect(() => stream.close()).toThrow('The socket is closed.')
  expect(removed).toBe(1)
  await Promise.all([failedRead, failedWrite])
  stream.close()
  expect(removed).toBe(1)
})
