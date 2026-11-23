import { expect, it } from 'vitest'

import type { WorkerToHost } from '../../src/shared/generated/WorkerToHost'
import {
  HOST_STREAM_FRAME_BYTES,
  HOST_STREAM_WINDOW_BYTES,
} from '../../src/shared/host'
import { HostStream } from './stream'

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
