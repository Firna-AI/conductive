import { afterEach, expect, it, vi } from 'vitest'

import { record, number } from '../chat/inputs'
import { HostWelcomeWait } from './host-connection'
import { hostConnectionFixture } from './host-connection.test-support'
import { encodeHostFrame } from '../../src/shared/host-frames'
import { HOST_REPLY_MAX_BYTES } from '../../src/shared/host'

afterEach(() => vi.useRealTimers())

it.each([
  {
    scenario: 'the host stays away',
    reconnects: false,
    code: 'machine_unavailable',
  },
  {
    scenario: 'the host connects late',
    reconnects: true,
    code: 'machine_timeout',
  },
])(
  'ends a status read at the shared deadline when $scenario',
  async ({ reconnects, code }) => {
    vi.useFakeTimers()
    const welcome = new HostWelcomeWait()
    const { connection, sent } = hostConnectionFixture()
    const host = connection()
    const status = {
      kind: 'command.status',
      processId: 7,
      stdoutOffset: 5,
      stderrOffset: 3,
    } as const
    const succeeded = vi.fn()
    const failed = vi.fn()
    void welcome
      .deadline(false)
      .then((deadline) => host.request(status, deadline))
      .then(succeeded, failed)

    await vi.advanceTimersByTimeAsync(29_000)
    expect(sent).toEqual([])
    expect(failed).not.toHaveBeenCalled()
    if (reconnects) welcome.welcomed()
    await vi.advanceTimersByTimeAsync(999)
    expect(failed).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(failed).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code }),
    )
    expect(succeeded).not.toHaveBeenCalled()
    welcome.welcomed()
    expect(sent).toEqual(
      reconnects ? [{ type: 'request', requestId: 1, operation: status }] : [],
    )
  },
)

it('keeps request IDs across a wake and ignores a timed-out request reply', async () => {
  vi.useFakeTimers()
  const { connection, sent } = hostConnectionFixture()
  const first = connection()
  const timeout = expect(
    first.request({ kind: 'file.info', path: '/tmp/file' }),
  ).rejects.toMatchObject({ code: 'machine_timeout' })
  const oldId = number(record(sent[0]).requestId)
  await vi.advanceTimersByTimeAsync(30_000)
  await timeout
  const restored = connection()
  let completed = false
  const next = restored
    .request({ kind: 'file.info', path: '/tmp/file' })
    .then((result) => {
      completed = true
      return result
    })
  const newId = number(record(sent[1]).requestId)
  expect(newId).not.toBe(oldId)
  restored.receive(
    JSON.stringify({
      type: 'reply',
      requestId: oldId,
      result: {
        kind: 'file.info',
        path: '/tmp/file',
        sizeBytes: 1,
        isDirectory: false,
      },
    }),
  )
  await Promise.resolve()
  expect(completed).toBe(false)
  restored.receive(
    JSON.stringify({
      type: 'reply',
      requestId: newId,
      result: {
        kind: 'file.info',
        path: '/tmp/file',
        sizeBytes: 2,
        isDirectory: false,
      },
    }),
  )
  expect(await next).toMatchObject({ sizeBytes: 2 })
  const opened = restored.open(7682)
  const opening = record(sent.at(-1))
  const streamId = number(record(opening.operation).streamId)
  restored.receive(
    JSON.stringify({
      type: 'reply',
      requestId: number(opening.requestId),
      result: { kind: 'stream.opened', streamId },
    }),
  )
  await opened
  const again = connection()
  again.welcomed()
  const another = again.open(7682)
  const latest = record(sent.at(-1))
  const nextStreamId = number(record(latest.operation).streamId)
  expect(nextStreamId).not.toBe(streamId)
  expect(number(latest.requestId)).toBeGreaterThan(number(opening.requestId))
  again.receive(
    JSON.stringify({
      type: 'reply',
      requestId: number(latest.requestId),
      result: { kind: 'stream.opened', streamId: nextStreamId },
    }),
  )
  await another
  restored.disconnect()
  again.disconnect()
})

it.each([false, true])(
  'closes a late opened stream after its deadline with a rebuilt connection %s',
  async (rebuild) => {
    vi.useFakeTimers()
    const { connection, sent } = hostConnectionFixture()
    const initial = connection()
    const timeout = expect(initial.open(7682)).rejects.toMatchObject({
      code: 'machine_timeout',
    })
    const request = record(sent[0])
    const streamId = number(record(request.operation).streamId)
    await vi.advanceTimersByTimeAsync(15_000)
    await timeout
    const receiver = rebuild ? connection() : initial
    receiver.receive(
      JSON.stringify({
        type: 'reply',
        requestId: number(request.requestId),
        result: { kind: 'stream.opened', streamId },
      }),
    )
    expect(sent.at(-1)).toEqual({ type: 'stream.close', streamId })
    const awakened = connection()
    for (let index = 0; index < 1_000; index++) {
      awakened.receive(
        encodeHostFrame({
          kind: 'streamData',
          streamId,
          data: new Uint8Array([1]),
        }).slice().buffer,
      )
      awakened.receive(JSON.stringify({ type: 'stream.end', streamId }))
      awakened.receive(
        JSON.stringify({ type: 'stream.credit', streamId, bytes: 1 }),
      )
      awakened.receive(
        JSON.stringify({
          type: 'reply',
          requestId: number(request.requestId),
          result: { kind: 'stream.opened', streamId },
        }),
      )
      for (const neverOpened of [number(request.requestId), 999])
        awakened.receive(
          encodeHostFrame({
            kind: 'streamData',
            streamId: neverOpened,
            data: new Uint8Array([1]),
          }).slice().buffer,
        )
    }
    expect(
      sent.filter((value) => record(value).type === 'stream.close'),
    ).toEqual([{ type: 'stream.close', streamId }])
  },
)

it('bounds inline UTF-8 bytes and rejects oversized strings before encoding', () => {
  const { connection } = hostConnectionFixture()
  const receiver = connection()
  const encode = vi.spyOn(TextEncoder.prototype, 'encode')
  try {
    const ping = '{"type":"ping"}'
    expect(receiver.receive(ping.padEnd(HOST_REPLY_MAX_BYTES, ' '))).toEqual({
      type: 'ping',
    })
    expect(encode).toHaveBeenCalledTimes(1)
    encode.mockClear()
    expect(() =>
      receiver.receive(ping.padEnd(HOST_REPLY_MAX_BYTES + 1, ' ')),
    ).toThrow('Inline host message too large.')
    expect(encode).not.toHaveBeenCalled()
    encode.mockClear()
    expect(() =>
      receiver.receive(
        JSON.stringify({ type: 'ping', extra: 'é'.repeat(524_288) }),
      ),
    ).toThrow('Inline host message too large.')
    expect(encode).toHaveBeenCalledTimes(1)
  } finally {
    encode.mockRestore()
  }
})
