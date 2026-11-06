import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('rejects malformed detached command results without exposing provider fields', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  server.responseOverride = Response.json({
    ok: true,
    type: 'command.started',
    success: true,
    processId: 'boat-first',
  })
  await expect(client.startCommand('bx_one', 'build')).rejects.toMatchObject({
    kind: 'invalid_response',
    status: 502,
    message: 'The sandbox provider request failed: invalid_response',
  })
  const valid = {
    ok: true,
    type: 'command.status',
    success: true,
    processId: 1234,
    status: 'running',
    running: true,
    exitCode: null,
    stdout: 'boat-first',
    stderr: '',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 10,
    stderrNextOffset: 0,
    more: false,
  }
  for (const change of [
    { type: 'command.finished' },
    { processId: 5678 },
    { status: 'unknown' },
    { stdoutNextOffset: undefined },
    { stderrOffset: -1 },
    { stdoutOffset: 11 },
    { more: 'false' },
    { timedOut: 'boat-first' },
  ]) {
    server.responseOverride = Response.json({ ...valid, ...change })
    await expect(
      client.getCommandStatus('bx_one', 1234, {
        stdoutOffset: 0,
        stderrOffset: 0,
      }),
    ).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 502,
      message: 'The sandbox provider request failed: invalid_response',
    })
  }
})

it('keeps detached start and status errors typed and redacted', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  server.failure = { status: 409, code: 'agent_outdated' }
  await expect(
    client.getCommandStatus('bx_one', 1234, {
      stdoutOffset: 0,
      stderrOffset: 0,
    }),
  ).rejects.toMatchObject({
    kind: 'conflict',
    status: 409,
    providerCode: 'agent_outdated',
    retryAfterSeconds: 3,
    message: 'The sandbox provider request failed: conflict',
  })
  server.failure = { status: 503, code: 'boat_direct_failed' }
  await expect(client.startCommand('bx_one', 'build')).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
    providerCode: 'boat_direct_failed',
    message: 'The sandbox provider request failed: unavailable',
  })
  expect(server.requests).toHaveLength(2)
})

it('rejects invalid command paths and byte offsets before a provider call', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  await expect(
    client.getCommandStatus('../orgs', 1234, {
      stdoutOffset: 0,
      stderrOffset: 0,
    }),
  ).rejects.toMatchObject({ kind: 'invalid_request', status: 400 })
  for (const [processId, stdoutOffset, stderrOffset] of [
    [0, 0, 0],
    [1.5, 0, 0],
    [1234, -1, 0],
    [1234, 0, Number.NaN],
  ]) {
    await expect(
      client.getCommandStatus('bx_one', processId, {
        stdoutOffset,
        stderrOffset,
      }),
    ).rejects.toMatchObject({ kind: 'invalid_request', status: 400 })
  }
  expect(server.requests).toHaveLength(0)
})
