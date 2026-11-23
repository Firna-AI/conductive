import { expect, it } from 'vitest'

import { HOST_MESSAGE_PART_BYTES } from '../../src/shared/host'
import { encodeHostFrame } from '../../src/shared/host-frames'
import { setupMachines } from './host.test-support'

const fixture = setupMachines()

it('joins UTF-8 reply parts and sends a large request in bounded parts', async () => {
  const f = await fixture()
  const host = await f.open()
  const command = 'x'.repeat(HOST_MESSAGE_PART_BYTES + 1)
  const call = f.client.runCommand(command, 1)
  expect(await host.inbox.request()).toMatchObject({
    operation: { kind: 'command.run', command },
  })
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      type: 'reply',
      requestId: 1,
      result: {
        kind: 'command.result',
        exitCode: 0,
        stdout: 'été',
        stderr: '',
        timedOut: false,
      },
    }),
  )
  const split = bytes.indexOf(0xc3) + 1
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'messagePart',
        requestId: 1,
        data: bytes.subarray(0, split),
        last: false,
      }),
    ),
  )
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'messagePart',
        requestId: 1,
        data: bytes.subarray(split),
        last: true,
      }),
    ),
  )
  expect(await call).toMatchObject({ stdout: 'été', exitCode: 0 })
})

it('fails a reply above its budget, drops its remaining parts, and still accepts the next reply', async () => {
  const f = await fixture()
  const host = await f.open()
  const call = f.client.fileInfo('/tmp/file')
  const failure = expect(call).rejects.toMatchObject({
    status: 502,
    code: 'sandbox_response_too_large',
  })
  const { requestId } = await host.inbox.request()
  for (let index = 0; index < 5; index++)
    host.socket.send(
      new Uint8Array(
        encodeHostFrame({
          kind: 'messagePart',
          requestId,
          last: false,
          data: new Uint8Array(HOST_MESSAGE_PART_BYTES),
        }),
      ),
    )
  await failure
  host.socket.send(
    new Uint8Array(
      encodeHostFrame({
        kind: 'messagePart',
        requestId,
        last: true,
        data: new Uint8Array([255]),
      }),
    ),
  )
  const next = f.client.fileInfo('/tmp/next')
  await host.reply({
    kind: 'file.info',
    path: '/tmp/next',
    sizeBytes: 0,
    isDirectory: true,
  })
  expect(await next).toMatchObject({ path: '/tmp/next', isDirectory: true })
})
