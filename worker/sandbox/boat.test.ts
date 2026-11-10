import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('starts sandboxes without inherited credentials', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  const input = {
    name: 'Task',
    snapshotName: 'org-image',
    ttlSeconds: 1800,
    idempotencyKey: 'request-one',
    noEnv: false,
  }
  await client.create(input)
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
  expect(forked.headers.get('Idempotency-Key')).toBe('request-two')
  for (const request of server.requests) {
    expect(request.headers.get('X-Boat-Org')).toBe('app-org')
    expect(request.headers.get('Cookie')).toBe(null)
    expect(await request.text()).not.toContain('boat-first')
  }
})

it('uses fixed lifecycle routes and confirms deletion with the sandbox id', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
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
  expect(server.requests[0].headers.get('X-Boat-Org')).toBe('app-org')
  expect(await server.requests[2].json()).toEqual({ ttlSeconds: 1800 })
})

it.each([true, false, undefined])(
  'reads hydrated as %s from the sandbox reply',
  async (hydrated) => {
    const server = new FakeBoat()
    server.responseOverride = Response.json({
      ok: true,
      type: 'sandbox.info',
      sandbox: { id: 'bx_one', state: 'ready', hydrated },
    })
    const client = new BoatClient('boat-first', server.fetch, 'app-org')
    expect(await client.get('bx_one')).toEqual({
      id: 'bx_one',
      state: 'ready',
      ...(hydrated === undefined ? {} : { hydrated }),
    })
  },
)

it('rejects a sandbox reply with a nonboolean hydrated field', async () => {
  const server = new FakeBoat()
  server.responseOverride = Response.json({
    ok: true,
    type: 'sandbox.info',
    sandbox: { id: 'bx_one', state: 'ready', hydrated: 'false' },
  })
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  await expect(client.get('bx_one')).rejects.toMatchObject({
    kind: 'invalid_response',
    status: 502,
  })
})

it('uses fixed snapshot and waiting command routes', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  await client.saveSnapshot('bx_one', 'org-image')
  await client.getSnapshot('org-image')
  await client.deleteSnapshot('org-image')
  await client.runCommand('bx_one', 'npm test')
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
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
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
