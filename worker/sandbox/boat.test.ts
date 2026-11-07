import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('identifies the active Boat wallet with one read-only discovery call', async () => {
  const server = new FakeBoat()
  server.responseOverride = Response.json({
    ok: true,
    type: 'org.list',
    orgs: [
      { id: 'personal-user', type: 'personal', active: false },
      { id: 'team-current', type: 'org', active: true },
    ],
  })
  expect(await BoatClient.inspectAccount('boat-first', server.fetch)).toEqual({
    id: 'team-current',
    type: 'org',
  })
  expect(server.requests).toHaveLength(1)
  expect(server.requests[0].method).toBe('GET')
  expect(server.requests[0].url).toBe('https://boat.dev/api/v1/orgs')
  expect(server.requests[0].headers.get('Authorization')).toBe(
    'Bearer boat-first',
  )
  expect(server.requests[0].redirect).toBe('manual')
})

it('starts sandboxes without inherited credentials and pins the saved wallet', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  const input = {
    name: 'Task',
    snapshotName: 'org-image',
    ttlSeconds: 1800,
    idempotencyKey: 'request-one',
    noEnv: false,
  }
  expect(await client.create(input)).toEqual({ id: 'bx_one', state: 'ready' })
  await client.resume('bx_one', { WORKSPACE_TOKEN: 'workspace-token' }, 1800)
  await client.fork('bx_one', { ...input, idempotencyKey: 'request-two' })
  const [created, resumed, forked] = server.requests
  expect(await created.clone().json()).toEqual({
    name: 'Task',
    from: 'org-image',
    type: 'default',
    noEnv: true,
    env: {},
    ttlSeconds: 1800,
  })
  expect(await resumed.clone().json()).toEqual({
    noEnv: true,
    env: { WORKSPACE_TOKEN: 'workspace-token' },
    ttlSeconds: 1800,
  })
  expect(await forked.clone().json()).toEqual({
    name: 'Task',
    type: 'default',
    noEnv: true,
    env: {},
    ttlSeconds: 1800,
  })
  expect(created.headers.get('Idempotency-Key')).toBe('request-one')
  expect(forked.headers.get('Idempotency-Key')).toBe('request-two')
  for (const request of server.requests) {
    expect(request.headers.get('X-Boat-Org')).toBe('team-one')
    expect(request.headers.get('Cookie')).toBe(null)
    expect(await request.text()).not.toContain('boat-first')
  }
})

it('uses fixed lifecycle routes and confirms deletion with the sandbox id', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-personal', server.fetch, {
    id: 'user-one',
    type: 'personal',
  })
  await client.get('bx_one')
  await client.stop('bx_one')
  await client.setAutoStop('bx_one', 1800)
  await client.delete('bx_one')
  expect(
    server.requests.map((request) => [
      request.method,
      new URL(request.url).pathname,
    ]),
  ).toEqual([
    ['GET', '/api/v1/sandboxes/bx_one'],
    ['POST', '/api/v1/sandboxes/bx_one/stop'],
    ['PATCH', '/api/v1/sandboxes/bx_one'],
    ['DELETE', '/api/v1/sandboxes/bx_one'],
  ])
  expect(server.requests[3].headers.get('X-Ascii-Confirm-Delete')).toBe(
    'bx_one',
  )
  expect(server.requests[0].headers.get('X-Boat-Org')).toBe('personal')
  expect(await server.requests[2].json()).toEqual({ ttlSeconds: 1800 })
})

it('reads typed snapshots and command results through their fixed routes', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  expect(await client.saveSnapshot('bx_one', 'org-image')).toEqual({
    name: 'org-image',
    sourceSandboxId: 'bx_one',
    status: 'ready',
  })
  expect(await client.getSnapshot('org-image')).toMatchObject({
    status: 'ready',
  })
  await client.deleteSnapshot('org-image')
  expect(await client.runCommand('bx_one', 'npm test')).toEqual({
    exitCode: 0,
    stdout: 'done\n',
    stderr: '',
    timedOut: false,
  })
  expect(
    server.requests.map((request) => [
      request.method,
      new URL(request.url).pathname,
    ]),
  ).toEqual([
    ['POST', '/api/v1/saved-snapshots'],
    ['GET', '/api/v1/saved-snapshots/org-image'],
    ['DELETE', '/api/v1/saved-snapshots/org-image'],
    ['POST', '/api/v1/sandboxes/bx_one/commands'],
  ])
  expect(await server.requests[0].json()).toEqual({
    sandboxId: 'bx_one',
    name: 'org-image',
  })
  expect(await server.requests[3].json()).toEqual({
    command: 'npm test',
    timeoutSeconds: 600,
  })
})

it('cannot turn an id into an unlisted Boat route', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  for (const sandboxId of [
    '..',
    '../me',
    'bx_one/../../me',
    'bx_one?key=secret',
    'https://evil.test',
  ]) {
    await expect(client.get(sandboxId)).rejects.toMatchObject({
      kind: 'invalid_request',
      status: 400,
    })
  }
  expect(server.requests).toHaveLength(0)
})
