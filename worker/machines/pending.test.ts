import { afterEach, expect, it, vi } from 'vitest'

import {
  HOST_COMMAND_REPLY_MAX_BYTES,
  HOST_MESSAGE_PART_BYTES,
} from '../../src/shared/host'
import { PendingRequests } from './pending'

afterEach(() => vi.useRealTimers())

it('times out commands, port opens, and other requests at their specified deadlines', async () => {
  vi.useFakeTimers()
  const pending = new PendingRequests()
  const command = pending.create({
    kind: 'command.run',
    command: 'sleep 600',
    timeoutSeconds: 600,
  })
  const stream = pending.create({
    kind: 'stream.open',
    streamId: 1,
    port: 7681,
  })
  const file = pending.create({ kind: 'file.info', path: '/tmp/file' })
  const failedCommand = expect(command.promise).rejects.toMatchObject({
    status: 504,
    code: 'machine_timeout',
  })
  const failedStream = expect(stream.promise).rejects.toMatchObject({
    status: 504,
    code: 'machine_timeout',
  })
  const failedFile = expect(file.promise).rejects.toMatchObject({
    status: 504,
    code: 'machine_timeout',
  })
  await vi.advanceTimersByTimeAsync(15_000)
  await failedStream
  expect(vi.getTimerCount()).toBe(2)
  await vi.advanceTimersByTimeAsync(15_000)
  await failedFile
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(580_000)
  await failedCommand
  expect(vi.getTimerCount()).toBe(0)
})

it('counts command bytes, file base64 budgets, and the smaller budget of error replies', async () => {
  const pending = new PendingRequests()
  const command = pending.create({
    kind: 'command.run',
    command: 'true',
    timeoutSeconds: 1,
  })
  const commandFailure = expect(command.promise).rejects.toMatchObject({
    status: 502,
    code: 'command_output_too_large',
  })
  pending.reply(
    command.id,
    {
      kind: 'command.result',
      exitCode: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
    },
    18_874_369,
  )
  await commandFailure
  const file = pending.create({
    kind: 'file.read',
    path: '/tmp/file',
    maxBytes: 4,
  })
  const fileFailure = expect(file.promise).rejects.toMatchObject({
    status: 502,
    code: 'sandbox_response_too_large',
  })
  pending.part(file.id, new Uint8Array(1_048_585), false)
  await fileFailure
  const error = pending.create({
    kind: 'command.status',
    processId: 1,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  const errorFailure = expect(error.promise).rejects.toMatchObject({
    code: 'sandbox_response_too_large',
  })
  pending.reply(error.id, { kind: 'error', code: 'internal' }, 1_048_577)
  await errorFailure
  const exact = pending.create({
    kind: 'file.read',
    path: '/tmp/file',
    maxBytes: 4,
  })
  pending.reply(
    exact.id,
    {
      kind: 'file.content',
      path: '/tmp/file',
      sizeBytes: 4,
      content: 'YWFhYQ==',
      encoding: 'base64',
    },
    1_048_584,
  )
  expect(await exact.promise).toMatchObject({ content: 'YWFhYQ==' })
})

it('keeps incomplete replies below two command budgets and releases them on disconnect', async () => {
  const pending = new PendingRequests()
  const first = pending.create({
    kind: 'command.run',
    command: 'one',
    timeoutSeconds: 1,
  })
  const second = pending.create({
    kind: 'command.run',
    command: 'two',
    timeoutSeconds: 1,
  })
  const outcomes = Promise.allSettled([first.promise, second.promise])
  const part = new Uint8Array(HOST_MESSAGE_PART_BYTES)
  for (
    let bytes = 0;
    bytes < HOST_COMMAND_REPLY_MAX_BYTES;
    bytes += part.byteLength
  )
    pending.part(first.id, part, false)
  for (
    let bytes = 0;
    bytes < HOST_COMMAND_REPLY_MAX_BYTES - part.byteLength;
    bytes += part.byteLength
  )
    pending.part(second.id, part, false)
  expect(() => pending.part(second.id, part, false)).toThrow(
    'Host message assembly limit exceeded.',
  )
  pending.disconnect()
  expect(await outcomes).toMatchObject([
    { status: 'rejected', reason: { code: 'machine_disconnected' } },
    { status: 'rejected', reason: { code: 'machine_disconnected' } },
  ])
  const next = pending.create({ kind: 'command.start', command: 'three' })
  pending.reply(next.id, { kind: 'command.started', processId: 3 }, 64)
  expect(await next.promise).toMatchObject({ processId: 3 })
})
