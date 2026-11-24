import { expect, it } from 'vitest'

import type { HostErrorCode } from '../../src/shared/generated/HostErrorCode'
import { HOST_FILE_READ_MAX_BYTES } from '../../src/shared/host'
import { hash } from '../security/crypto'
import { setupMachines } from './host.test-support'

const fixture = setupMachines()

it('runs commands, reads detached status, and reads file metadata and bounded content through a host', async () => {
  const f = await fixture()
  const host = await f.open()
  const run = f.client.runCommand('printf hello', 2)
  expect(
    await host.reply({
      kind: 'command.result',
      exitCode: 0,
      stdout: 'hello',
      stderr: '',
      timedOut: false,
    }),
  ).toEqual({ kind: 'command.run', command: 'printf hello', timeoutSeconds: 2 })
  expect(await run).toEqual({
    kind: 'command.result',
    exitCode: 0,
    stdout: 'hello',
    stderr: '',
    timedOut: false,
  })
  const start = f.client.startCommand('sleep 10')
  expect(await host.reply({ kind: 'command.started', processId: 32 })).toEqual({
    kind: 'command.start',
    command: 'sleep 10',
  })
  expect(await start).toEqual({ kind: 'command.started', processId: 32 })
  const status = f.client.commandStatus(32, 4, 2)
  expect(
    await host.reply({
      kind: 'command.status',
      processId: 32,
      state: 'exited',
      running: false,
      exitCode: 7,
      timedOut: null,
      stdout: 'tail',
      stderr: 'end',
      stdoutNextOffset: 8,
      stderrNextOffset: 5,
      more: false,
    }),
  ).toEqual({
    kind: 'command.status',
    processId: 32,
    stdoutOffset: 4,
    stderrOffset: 2,
  })
  expect(await status).toMatchObject({
    state: 'exited',
    exitCode: 7,
    stdoutNextOffset: 8,
    stderrNextOffset: 5,
  })
  const info = f.client.fileInfo('/tmp/file')
  expect(
    await host.reply({
      kind: 'file.info',
      path: '/tmp/file',
      sizeBytes: 3,
      isDirectory: false,
    }),
  ).toEqual({ kind: 'file.info', path: '/tmp/file' })
  expect(await info).toEqual({
    kind: 'file.info',
    path: '/tmp/file',
    sizeBytes: 3,
    isDirectory: false,
  })
  const read = f.client.readFile('/tmp/file', 3)
  expect(
    await host.reply({
      kind: 'file.content',
      path: '/tmp/file',
      sizeBytes: 3,
      encoding: 'base64',
      content: 'YWJj',
    }),
  ).toEqual({ kind: 'file.read', path: '/tmp/file', maxBytes: 3 })
  expect(await read).toMatchObject({ encoding: 'base64', content: 'YWJj' })
  const tooLarge = f.client.readFile('/tmp/file', 2)
  await host.reply({ kind: 'file.too_large', sizeBytes: 3, limitBytes: 2 })
  expect(await tooLarge).toEqual({
    kind: 'file.too_large',
    sizeBytes: 3,
    limitBytes: 2,
  })
  await expect(
    f.client.readFile('/tmp/file', HOST_FILE_READ_MAX_BYTES + 1),
  ).rejects.toMatchObject({ status: 400, code: 'invalid_request' })
  await expect(f.client.runCommand('true', 601)).rejects.toMatchObject({
    status: 400,
    code: 'invalid_request',
  })
})

it('maps host errors to fixed caller errors without copying host text', async () => {
  const f = await fixture()
  const host = await f.open()
  const cases: {
    host: HostErrorCode
    status: number
    code: string
    message: string
  }[] = [
    {
      host: 'invalid_request',
      status: 400,
      code: 'invalid_request',
      message: 'The request is not valid.',
    },
    {
      host: 'not_found',
      status: 404,
      code: 'file_not_found',
      message: 'The file is not available.',
    },
    {
      host: 'permission_denied',
      status: 403,
      code: 'permission_denied',
      message: 'The cloud computer refused access.',
    },
    {
      host: 'is_directory',
      status: 400,
      code: 'is_directory',
      message: 'The path is a folder.',
    },
    {
      host: 'output_too_large',
      status: 502,
      code: 'command_output_too_large',
      message: 'The command output is too large.',
    },
    {
      host: 'port_unavailable',
      status: 503,
      code: 'port_unavailable',
      message: 'The port is not available. Try again.',
    },
    {
      host: 'busy',
      status: 503,
      code: 'machine_busy',
      message: 'The cloud computer is busy. Try again.',
    },
    {
      host: 'internal',
      status: 502,
      code: 'machine_error',
      message: 'The cloud computer request failed. Try again.',
    },
  ]
  for (const item of cases) {
    const call = f.client.fileInfo('/tmp/file')
    const failure = expect(call).rejects.toMatchObject({
      status: item.status,
      code: item.code,
      message: item.message,
    })
    const request = await host.inbox.request()
    host.socket.send(
      JSON.stringify({
        type: 'reply',
        requestId: request.requestId,
        result: { kind: 'error', code: item.host, message: f.token },
      }),
    )
    await failure
  }
})

it('keeps a welcomed connection through hibernation and an idempotent token issue', async () => {
  const f = await fixture()
  const host = await f.open()
  await f.client.issue(await hash(f.token))
  await f.runtime.unsafeEvictDurableObject('outer-chat-tests', 'Machine', {
    name: f.name,
    webSockets: 'hibernate',
  })
  expect((await f.client.connection()).connected).toBe(true)
  const call = f.client.startCommand('true')
  await host.reply({ kind: 'command.started', processId: 18 })
  expect(await call).toEqual({ kind: 'command.started', processId: 18 })
})

it('bounds pending work and closes a malformed host connection', async () => {
  const f = await fixture()
  const host = await f.open()
  const work = Array.from({ length: 64 }, () => f.client.fileInfo('/tmp/file'))
  const outcomes = Promise.allSettled(work)
  for (let index = 0; index < 64; index++) await host.inbox.request()
  await expect(f.client.fileInfo('/tmp/extra')).rejects.toMatchObject({
    status: 503,
    code: 'machine_busy',
  })
  host.socket.send('{invalid')
  expect(await host.closed).toBe(1008)
  expect((await outcomes).map((result) => result.status)).toEqual(
    Array.from({ length: 64 }, () => 'rejected'),
  )
})
