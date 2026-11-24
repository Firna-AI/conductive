import { expect, it } from 'vitest'

import {
  computerResources,
  hello,
  helloMessage,
  setupOwnComputers,
} from './fixture.test-support'
import { computerObjectId } from './identity'

const setup = setupOwnComputers()

it('refuses an incorrect token and closes an unsupported hello before any operation', async () => {
  const f = await setup()
  const added = await f.add()
  const token = await added.enroll()
  const wrong = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
  expect((await f.dispatch('GET', wrong)).status).toBe(401)

  const host = await f.open(token)
  await expect(added.client.get('workspace-1')).rejects.toMatchObject({
    status: 503,
    code: 'computer_offline',
  })
  host.send({ ...helloMessage(), computerProtocolVersion: 77 })
  expect(await host.closed).toBe(4400)
  expect(await added.client.connection()).toEqual({ connected: false })
  expect((await added.read()).resources).toBeNull()
})

it('records first hello, replaces the socket, and keeps the set limit on later hello', async () => {
  const f = await setup()
  const added = await f.add()
  const { host, token } = await added.connect()
  const first = await added.read()
  expect(first).toMatchObject({
    connection: { kind: 'connected' },
    resources: computerResources,
    limit: 3,
    defaultLimit: 3,
  })
  const initial = await f.db
    .prepare(
      `SELECT connected_at, build_requested_at, build_requested_by_user_id,
       program_version, computer_protocol_version FROM own_computers WHERE id = ?`,
    )
    .bind(added.computerId)
    .first()
  expect(initial).toEqual({
    connected_at: expect.any(Number),
    build_requested_at: first.buildRequestedAt,
    build_requested_by_user_id: null,
    program_version: '0.0.42',
    computer_protocol_version: 1,
  })
  expect(initial?.build_requested_at).toBe(initial?.connected_at)
  expect((await f.request(added.path, 'PATCH', { limit: 5 })).status).toBe(200)

  const next = await f.open(token)
  expect(await host.closed).toBe(4001)
  const smaller = {
    cpus: 2,
    memoryBytes: 4_294_967_296,
    system: 'Debian 12 · x86_64',
  }
  await hello(next, smaller)
  expect(await added.read()).toMatchObject({
    resources: smaller,
    limit: 5,
    defaultLimit: 1,
    buildRequestedAt: first.buildRequestedAt,
  })
  next.send({ type: 'ping' })
  expect(await next.next()).toEqual({ type: 'pong' })
  next.socket.close()
  await next.closed
  expect((await added.read()).connection).toEqual({
    kind: 'offline',
    lastSeenAt: expect.any(Number),
  })
})

it('checks the org and computer identity again in the object', async () => {
  const f = await setup()
  const added = await f.add()
  await added.connect()
  const ns = f.harness.native.bindings.OWN_COMPUTERS
  const stub = ns.get(computerObjectId(ns, added.computerId))
  for (const owner of [
    { ...added.owner, orgId: 'another-org' },
    { ...added.owner, computerId: 'another-computer' },
  ]) {
    expect(await stub.connection(owner)).toEqual({
      ok: false,
      error: {
        status: 404,
        code: 'own_computer_not_found',
        message: 'The own computer is not available.',
      },
    })
  }
  expect(await added.client.connection()).toEqual({ connected: true })
})

it('removes a welcomed computer, closes its connection, and lets DELETE finish twice', async () => {
  const f = await setup()
  const added = await f.add()
  const { token, host } = await added.connect()
  expect((await f.request(added.path, 'DELETE')).status).toBe(204)
  expect(await host.closed).toBe(4003)
  expect((await f.dispatch('GET', token)).status).toBe(401)
  expect(await (await f.request(f.root)).json()).toEqual({ computers: [] })
  for (const [path, method] of [
    [added.path, 'GET'],
    [added.path, 'PATCH'],
    [added.codePath, 'GET'],
    [added.codePath, 'POST'],
    [added.buildsPath, 'POST'],
  ]) {
    const response = await f.request(path, method, { limit: 2 })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'own_computer_not_found',
        message: 'The own computer is not available.',
      },
    })
  }
  expect((await f.request(added.path, 'DELETE')).status).toBe(204)
})
