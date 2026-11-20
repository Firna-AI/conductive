import { expect, it } from 'vitest'

import { fakeE2bJobPath } from '../../test-support/fake-e2b-envd'
import { e2bFixture } from './client.test-support'

const fixture = e2bFixture()

function ready() {
  const value = fixture()
  value.server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  return value
}

it('reads split Connect frames and reports the supervised 600-second timeout outcome', async () => {
  const { client, server } = ready()
  server.envd.chunkBytes = 1
  server.envd.result = {
    stdout: 'é\n',
    stderr: 'stopped\n',
    exitCode: 137,
    timedOut: true,
  }
  await expect(client.runCommand('sandbox-one', 'sleep 700')).resolves.toEqual({
    stdout: 'é\n',
    stderr: 'stopped\n',
    exitCode: 137,
    timedOut: true,
  })
  expect(server.envd.commands[0]).toMatchObject({
    command: 'sleep 700',
    timeoutSeconds: 600,
    user: 'user',
  })
  const start = server.requests.find(
    (request) => new URL(request.url).pathname === '/process.Process/Start',
  )
  expect(start?.headers.get('Connect-Timeout-Ms')).toBe('610000')
})

it('does not treat a missing or malformed final status as a successful waiting command', async () => {
  const { client, server } = ready()
  server.envd.omitExit = true
  await expect(client.runCommand('sandbox-one', 'build')).rejects.toMatchObject(
    { kind: 'invalid_response', status: 502 },
  )
  server.envd.omitExit = false
  server.envd.malformedExit = true
  await expect(client.runCommand('sandbox-one', 'build')).rejects.toMatchObject(
    { kind: 'invalid_response', status: 502 },
  )
})

it('keeps an incomplete UTF-8 suffix at its byte offset until a later poll completes it', async () => {
  const { client, server } = ready()
  await client.startCommand('sandbox-one', 'build')
  server.envd.files.delete(fakeE2bJobPath(1234, 'exit.json'))
  server.envd.files.set(
    fakeE2bJobPath(1234, 'stdout'),
    new Uint8Array([65, 0xc3]),
  )
  const first = await client.getCommandStatus('sandbox-one', 1234, {
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  expect(first).toMatchObject({
    stdout: 'A',
    stdoutNextOffset: 1,
    state: 'running',
    more: true,
  })
  server.envd.files.set(
    fakeE2bJobPath(1234, 'stdout'),
    new Uint8Array([65, 0xc3, 0xa9, 10]),
  )
  await expect(
    client.getCommandStatus('sandbox-one', 1234, {
      stdoutOffset: 1,
      stderrOffset: 0,
    }),
  ).resolves.toMatchObject({
    stdout: 'é\n',
    stdoutOffset: 1,
    stdoutNextOffset: 4,
  })
})

it('reports a missing job as lost and never reuses the saved byte offsets', async () => {
  const { client } = ready()
  await expect(
    client.getCommandStatus('sandbox-one', 1234, {
      stdoutOffset: 100,
      stderrOffset: 20,
    }),
  ).resolves.toEqual({
    processId: 1234,
    state: 'lost',
    running: false,
    exitCode: null,
    timedOut: null,
    stdout: '',
    stderr: '',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 0,
    stderrNextOffset: 0,
    more: false,
  })
})

it('cancels an announced Connect frame above the complete command budget before allocating it', async () => {
  const { client, server } = ready()
  let cancelled = 0
  const header = new Uint8Array(5)
  new DataView(header.buffer).setUint32(1, 18_874_369)
  server.envd.response = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(header)
        },
        cancel() {
          cancelled++
        },
      }),
    )
  await expect(client.runCommand('sandbox-one', 'build')).rejects.toMatchObject(
    {
      status: 502,
      code: 'command_output_too_large',
      message: 'The command output is too large.',
    },
  )
  expect(cancelled).toBe(1)
})

it('applies one combined output budget to both waiting command streams', async () => {
  const { client, server } = ready()
  server.envd.result = {
    stdout: 'x'.repeat(8_388_608),
    stderr: 'y'.repeat(8_388_608),
    exitCode: 0,
    timedOut: false,
  }
  await expect(
    client.runCommand('sandbox-one', 'permitted build').then((result) => ({
      stdout: result.stdout.length,
      stderr: result.stderr.length,
      exitCode: result.exitCode,
    })),
  ).resolves.toEqual({ stdout: 8_388_608, stderr: 8_388_608, exitCode: 0 })
  server.envd.result = {
    stdout: 'x'.repeat(9_437_184),
    stderr: 'y'.repeat(9_437_184),
    exitCode: 0,
    timedOut: false,
  }
  await expect(
    client.runCommand('sandbox-one', 'large build'),
  ).rejects.toMatchObject({ status: 502, code: 'command_output_too_large' })
})

it('refuses escaped command text before it can expand beyond the logical JSON budget', async () => {
  const { client, server } = ready()
  server.envd.result = {
    stdout: '\0'.repeat(3_200_000),
    stderr: '',
    exitCode: 0,
    timedOut: false,
  }
  const outcome: unknown = await client
    .runCommand('sandbox-one', 'escaped build')
    .then(
      () => 'accepted',
      (error: unknown) => error,
    )
  expect(outcome).toMatchObject({
    status: 502,
    code: 'command_output_too_large',
  })
})
