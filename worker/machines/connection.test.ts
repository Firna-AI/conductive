import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { HOST_PATH } from '../../src/shared/host'
import { OUTER_MACHINE_ORIGIN } from '../chat/integration/outer-runtime.test-support'
import { routeHost } from './route'
import {
  buildMachineOwner,
  issueMachineToken,
  machineClient,
  workspaceMachineOwner,
} from './client'
import { testMachineClient } from './client.test-support'
import { machineObjectName } from './identity'
import { setupMachines } from './host.test-support'

const fixture = setupMachines()

it('leaves no record when revoking a machine that never received a token', async () => {
  const f = await fixture()
  const owner = workspaceMachineOwner(
    f.owner.orgId,
    `${f.owner.workspaceId}-unissued`,
  )
  const client = testMachineClient(f, owner)
  await client.revoke()
  await expect(client.connection()).rejects.toMatchObject({
    status: 404,
    code: 'machine_not_found',
  })
  await f.runtime.unsafeEvictDurableObject('outer-chat-tests', 'Machine', {
    name: machineObjectName(owner),
    webSockets: 'hibernate',
  })
  await expect(client.connection()).rejects.toMatchObject({
    status: 404,
    code: 'machine_not_found',
  })
})

it('accepts only a machine bearer token on the machine host route', async () => {
  const f = await fixture()
  for (const token of [
    'workspace-token',
    f.token.slice(0, -1) + (f.token.endsWith('x') ? 'y' : 'x'),
    `cndm1.${'0'.repeat(64)}.${'s'.repeat(43)}`,
  ]) {
    const response = await f.connect(token)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'machine_token_required',
        message: 'The connection is not available.',
      },
    })
  }
  const forbidden: Record<string, string>[] = [
    { Origin: f.env.APP_ORIGIN },
    { Cookie: 'session=browser' },
  ]
  for (const headers of forbidden)
    expect((await f.connect(f.token, headers)).status).toBe(403)
  expect(
    (await f.runtime.dispatchFetch(OUTER_MACHINE_ORIGIN + HOST_PATH)).status,
  ).toBe(426)
  expect(
    (
      await f.runtime.dispatchFetch(f.env.APP_ORIGIN + HOST_PATH, {
        headers: { Authorization: `Bearer ${f.token}` },
      })
    ).status,
  ).toBe(501)
  expect(
    (
      await f.runtime.dispatchFetch(
        OUTER_MACHINE_ORIGIN + MACHINE_PATHS.runner,
        {
          headers: { Upgrade: 'websocket', Authorization: `Bearer ${f.token}` },
        },
      )
    ).status,
  ).toBe(401)
  await expect(
    routeHost(
      new Request(OUTER_MACHINE_ORIGIN + HOST_PATH, {
        headers: { Upgrade: 'websocket', Authorization: `Bearer ${f.token}` },
      }),
      { ...f.env, MACHINES: undefined },
    ),
  ).rejects.toMatchObject({ status: 503, code: 'service_unavailable' })
})

it('waits for hello, saves its version, and refuses an unsupported version before work', async () => {
  const f = await fixture()
  const host = await f.open(f.token, false)
  await expect(f.client.runCommand('echo ready', 1)).rejects.toMatchObject({
    code: 'machine_unavailable',
  })
  host.send({
    type: 'hello',
    hostProtocolVersion: 77,
    programVersion: 'future-release',
  })
  expect(await host.closed).toBe(4400)
  expect(await f.client.connection()).toMatchObject({
    connected: false,
    hello: { hostProtocolVersion: 77, programVersion: 'future-release' },
  })
  const current = await f.open()
  expect(await f.client.connection()).toMatchObject({
    connected: true,
    hello: { hostProtocolVersion: 1, programVersion: 'test-release' },
  })
  current.send({ type: 'ping' })
  expect(await current.inbox.next()).toEqual({ type: 'pong' })
})

it('replaces a connection, fails pending work on drop, and revokes old tokens', async () => {
  const f = await fixture()
  const first = await f.open()
  const pending = f.client.fileInfo('/tmp/file')
  const failed = expect(pending).rejects.toMatchObject({
    status: 503,
    code: 'machine_disconnected',
  })
  await first.inbox.request()
  const next = await f.open()
  expect(await first.closed).toBe(4001)
  await failed
  const changed = await issueMachineToken(f.env, f.owner)
  expect(await next.closed).toBe(4003)
  expect((await f.connect()).status).toBe(401)
  const resumed = await f.open(changed)
  await f.client.revoke()
  expect(await resumed.closed).toBe(4003)
  expect((await f.connect(changed)).status).toBe(401)
  await f.client.revoke()
  const token = await issueMachineToken(f.env, f.owner)
  const dropped = await f.open(token)
  const request = f.client.fileInfo('/tmp/file')
  const disconnected = expect(request).rejects.toMatchObject({
    code: 'machine_disconnected',
  })
  await dropped.inbox.request()
  dropped.socket.close()
  await disconnected
})

it.each(['workspace', 'build'] as const)(
  'refuses another org of a %s machine before token changes and every operation',
  async (kind) => {
    const f = await fixture()
    const owner =
      kind === 'build' ? buildMachineOwner(f.owner.orgId, 'build-one') : f.owner
    const token =
      kind === 'build' ? await issueMachineToken(f.env, owner) : f.token
    const other = machineClient(f.env, { ...owner, orgId: 'another-org' })
    const calls = [
      () => other.issue('a'.repeat(43)),
      () => other.revoke(),
      () => other.connection(),
      () => other.runCommand('true', 1),
      () => other.startCommand('true'),
      () => other.commandStatus(1),
      () => other.fileInfo('/tmp/file'),
      () => other.readFile('/tmp/file', 10),
      () => other.openStream(7681),
    ]
    for (const call of calls)
      await expect(call()).rejects.toMatchObject({
        status: 404,
        code: 'machine_not_found',
      })
    await f.open(token)
    expect((await testMachineClient(f, owner).connection()).connected).toBe(
      true,
    )
  },
)
