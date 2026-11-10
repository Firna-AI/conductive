import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('serializes detached commands and byte offsets through fixed Boat routes', async () => {
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
  await client.startCommand('bx space', 'npm run build')
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
  await client.getCommandStatus('bx space', 1234, {
    stdoutOffset: first.stdoutNextOffset,
    stderrOffset: first.stderrNextOffset,
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
