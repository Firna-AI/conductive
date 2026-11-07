import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('starts a detached build and continues logs from provider byte offsets', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  server.responseOverride = Response.json({
    ok: true,
    type: 'command.started',
    success: true,
    processId: 1234,
    pid: 1234,
    command: 'npm run build',
    startedAt: '2026-11-06T00:00:00Z',
  })
  expect(await client.startCommand('bx space', 'npm run build')).toEqual({
    processId: 1234,
  })
  server.responseOverride = Response.json({
    ok: true,
    type: 'command.status',
    success: true,
    processId: 1234,
    status: 'running',
    running: true,
    exitCode: null,
    stdout: 'é\n',
    stderr: 'warning\n',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 3,
    stderrNextOffset: 8,
    more: true,
  })
  const first = await client.getCommandStatus('bx space', 1234, {
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  expect(first).toEqual({
    processId: 1234,
    state: 'running',
    running: true,
    exitCode: null,
    timedOut: null,
    stdout: 'é\n',
    stderr: 'warning\n',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 3,
    stderrNextOffset: 8,
    more: true,
  })
  server.responseOverride = Response.json({
    ok: true,
    type: 'command.status',
    success: false,
    processId: 1234,
    status: 'exited',
    running: false,
    exitCode: 137,
    timedOut: true,
    stdout: 'done\n',
    stderr: '',
    stdoutOffset: 3,
    stderrOffset: 8,
    stdoutNextOffset: 8,
    stderrNextOffset: 8,
    more: false,
  })
  expect(
    await client.getCommandStatus('bx space', 1234, {
      stdoutOffset: first.stdoutNextOffset,
      stderrOffset: first.stderrNextOffset,
    }),
  ).toEqual({
    processId: 1234,
    state: 'exited',
    running: false,
    exitCode: 137,
    timedOut: true,
    stdout: 'done\n',
    stderr: '',
    stdoutOffset: 3,
    stderrOffset: 8,
    stdoutNextOffset: 8,
    stderrNextOffset: 8,
    more: false,
  })
  expect(
    server.requests.map((request) => [request.method, request.url]),
  ).toEqual([
    ['POST', 'https://boat.dev/api/v1/sandboxes/bx%20space/commands'],
    [
      'GET',
      'https://boat.dev/api/v1/sandboxes/bx%20space/commands/1234?stdoutOffset=0&stderrOffset=0',
    ],
    [
      'GET',
      'https://boat.dev/api/v1/sandboxes/bx%20space/commands/1234?stdoutOffset=3&stderrOffset=8',
    ],
  ])
  expect(await server.requests[0].json()).toEqual({
    command: 'npm run build',
    detached: true,
  })
  for (const request of server.requests) {
    expect(request.headers.get('Authorization')).toBe('Bearer boat-first')
    expect(request.headers.get('X-Boat-Org')).toBe('app-org')
    expect(request.headers.get('Cookie')).toBeNull()
    expect(request.redirect).toBe('manual')
  }
})

it('preserves a lost process and reset offsets after an agent restart', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  server.responseOverride = Response.json({
    ok: true,
    type: 'command.status',
    success: true,
    processId: 1234,
    status: 'lost',
    running: false,
    exitCode: null,
    stdout: 'new log\n',
    stderr: '',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 8,
    stderrNextOffset: 0,
    more: false,
  })
  expect(
    await client.getCommandStatus('bx_one', 1234, {
      stdoutOffset: 100,
      stderrOffset: 5,
    }),
  ).toEqual({
    processId: 1234,
    state: 'lost',
    running: false,
    exitCode: null,
    timedOut: null,
    stdout: 'new log\n',
    stderr: '',
    stdoutOffset: 0,
    stderrOffset: 0,
    stdoutNextOffset: 8,
    stderrNextOffset: 0,
    more: false,
  })
})
