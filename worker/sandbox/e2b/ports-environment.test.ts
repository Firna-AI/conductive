import { expect, it } from 'vitest'

import { createInput, e2bFixture } from './client.test-support'
import { E2bClient } from './client'

const fixture = e2bFixture()

it('writes the current environment on create and resume with fresh envd credentials', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  server.envdToken = 'new-envd-token'
  await client.resume(
    'sandbox-one',
    { WORKSPACE_TOKEN: 'new-workspace-token', QUOTED: "a'b\nline" },
    900,
  )
  expect(server.envd.environmentContents).toEqual([
    expect.stringContaining('workspace-secret'),
    expect.stringContaining('new-workspace-token'),
  ])
  expect(server.envd.environmentContents[1]).not.toContain('workspace-secret')
  const envd = server.requests.filter((request) =>
    new URL(request.url).hostname.startsWith('49983-'),
  )
  expect(envd.map((request) => request.headers.get('X-Access-Token'))).toEqual([
    'private-envd-token',
    'private-envd-token',
    'private-envd-token',
    'new-envd-token',
    'new-envd-token',
    'new-envd-token',
  ])
  expect(
    envd
      .filter(
        (request) => new URL(request.url).pathname === '/process.Process/Start',
      )
      .every(
        (request) => request.headers.get('Authorization') === 'Basic cm9vdDo=',
      ),
  ).toBe(true)
  expect(
    envd.every(
      (request) =>
        !request.headers.has('X-API-Key') && request.redirect === 'manual',
    ),
  ).toBe(true)
})

it('returns a private network port without a connect or helper command', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  const count = server.envd.commands.length
  await expect(
    client.privatePort('sandbox-one', 3000, 'network'),
  ).resolves.toEqual({
    origin: 'https://3000-sandbox-one.eu.e2b.test',
    credential: {
      headers: { 'e2b-traffic-access-token': server.trafficToken },
      stripHeaders: [
        'e2b-traffic-access-token',
        'x-access-token',
        'e2b-sandbox-id',
        'e2b-sandbox-port',
      ],
      stripCookies: [],
      stripQueryParameters: [],
    },
  })
  expect(server.envd.commands).toHaveLength(count)
  expect(
    server.requests.some((request) =>
      new URL(request.url).pathname.endsWith('/connect'),
    ),
  ).toBe(false)
})

it('starts the root-only loopback relay within the same ten-second helper deadline', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  server.envd.result = {
    exitCode: 0,
    timedOut: false,
    stdout: '{"targetPort":3000,"listenPort":41235}\n',
    stderr: '',
  }
  await expect(
    client.privatePort('sandbox-one', 3000, 'localhost'),
  ).resolves.toMatchObject({ origin: 'https://41235-sandbox-one.eu.e2b.test' })
  expect(server.envd.commands.at(-1)).toMatchObject({
    user: 'root',
    timeoutSeconds: 10,
    command:
      'systemctl start conductive-e2b-port-relay.service && /usr/bin/python3 /run/conductive-e2b/port-relay.py ensure 3000',
  })
})

it('does not wake a paused sandbox to return a private port', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  await client.stop('sandbox-one')
  await expect(
    client.privatePort('sandbox-one', 3000, 'network'),
  ).rejects.toMatchObject({ kind: 'conflict', status: 409 })
  expect(
    server.requests.some((request) =>
      new URL(request.url).pathname.endsWith('/connect'),
    ),
  ).toBe(false)
})

it('returns a paused create replay without env bootstrap and still permits cleanup', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  await client.stop('sandbox-one')
  const before = server.requests.length
  const writes = server.envd.environmentContents.length
  await expect(client.create(createInput)).resolves.toEqual({
    id: 'sandbox-one',
    state: 'archived',
  })
  expect(server.envd.environmentContents).toHaveLength(writes)
  expect(
    server.requests
      .slice(before)
      .some(
        (request) =>
          new URL(request.url).pathname.endsWith('/connect') ||
          new URL(request.url).pathname === '/process.Process/Start',
      ),
  ).toBe(false)
  await client.delete('sandbox-one')
  expect(server.sandboxes.has('sandbox-one')).toBe(false)
})

it('records a paused lost create without connecting or requiring a traffic token', async () => {
  const { server, options } = fixture()
  const send = options.fetch
  const client = new E2bClient({
    ...options,
    fetch: async (request) => {
      const response = await send(request)
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes'
      ) {
        const sandbox = server.sandboxes.get('sandbox-one')
        if (!sandbox) throw new Error('Missing fake allocation.')
        sandbox.state = 'paused'
        sandbox.pauseMode = 'filesystem'
        throw new Error('lost reply')
      }
      return response
    },
  })
  await expect(client.create(createInput)).resolves.toEqual({
    id: 'sandbox-one',
    state: 'archived',
  })
  expect(
    server.requests.some((request) =>
      new URL(request.url).pathname.endsWith('/connect'),
    ),
  ).toBe(false)
  expect(
    await options.db
      .prepare(
        'SELECT count(*) FROM e2b_traffic_tokens WHERE provider_account = ?',
      )
      .bind(options.accountId)
      .first('count(*)'),
  ).toBe(0)
  await client.delete('sandbox-one')
  expect(server.sandboxes.has('sandbox-one')).toBe(false)
})
