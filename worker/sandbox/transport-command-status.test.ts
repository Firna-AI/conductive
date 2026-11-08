import { expect, it } from 'vitest'

import { countedReply, paddedBody } from './transport.test-support'

function statusBody() {
  return {
    ok: true,
    type: 'command.status',
    success: true,
    processId: 7,
    status: 'exited',
    running: false,
    exitCode: 0,
    timedOut: false,
    stdout: 'x'.repeat(2_100_000),
    stderr: '',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 2_100_000,
    stderrNextOffset: 0,
    more: false,
  }
}

it('reads command status output above 1 MiB without losing bytes', async () => {
  const reply = countedReply(paddedBody(statusBody(), 2_500_000))
  const pending = reply.client.getCommandStatus('bx_one', 7, {
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  await expect(pending).resolves.toMatchObject({
    state: 'exited',
    exitCode: 0,
    stdoutNextOffset: 2_100_000,
    stderrNextOffset: 0,
  })
  const result = await pending
  expect(result.stdout).toBe('x'.repeat(2_100_000))
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 2_500_000,
    cancelled: 0,
  })
})

it('cancels command status JSON above 18 MiB with the safe command error', async () => {
  const reply = countedReply(paddedBody(statusBody(), 18_874_368), {
    overflow: true,
  })
  await expect(
    reply.client.getCommandStatus('bx_one', 7, {
      stdoutOffset: 0,
      stderrOffset: 0,
    }),
  ).rejects.toMatchObject({
    status: 502,
    code: 'command_output_too_large',
    message: 'The command output is too large.',
  })
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 18_874_369,
    cancelled: 1,
  })
})
