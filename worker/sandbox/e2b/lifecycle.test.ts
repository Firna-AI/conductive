import { expect, it } from 'vitest'

import { E2bClient } from './client'
import { createInput, e2bFixture } from './client.test-support'

const fixture = e2bFixture()

it('creates once with private traffic and disk-only timeout and recovers a lost reply across clients', async () => {
  const { client, server, options } = fixture()
  server.loseCreate = true
  expect(await client.create(createInput)).toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
  expect(await new E2bClient(options).create(createInput)).toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
  const creates = server.requests.filter(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname === '/v2/sandboxes',
  )
  expect(creates).toHaveLength(1)
  const index = server.requests.indexOf(creates[0])
  expect(server.bodies[index]).toEqual({
    templateID: 'base-template',
    timeout: 1800,
    autoPause: true,
    autoPauseMemory: false,
    autoResume: { enabled: false },
    network: { allowPublicTraffic: false },
    metadata: {
      org: 'org-one',
      conductive_account: options.accountId,
      conductive_request: 'request-one',
      conductive_name: 'Workspace',
    },
  })
  expect(JSON.stringify(server.bodies)).not.toContain('workspace-secret')
  expect(
    server.requests
      .filter((request) => new URL(request.url).hostname === 'api.eu.e2b.test')
      .every(
        (request) =>
          request.redirect === 'manual' &&
          request.headers.get('X-API-Key') === server.apiKey &&
          !request.headers.has('Cookie'),
      ),
  ).toBe(true)
  expect(
    server.requests
      .filter((request) => new URL(request.url).hostname.startsWith('49983-'))
      .every(
        (request) =>
          !request.headers.has('X-API-Key') &&
          !request.headers.has('Cookie') &&
          request.redirect === 'manual',
      ),
  ).toBe(true)
})

it('keeps an ambiguous missing create pending without posting again', async () => {
  const { client, server, options } = fixture()
  server.loseCreate = true
  server.fetch = async () => {
    throw new Error(server.apiKey)
  }
  const missing = new E2bClient({ ...options, fetch: server.fetch })
  await expect(missing.create(createInput)).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
  })
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
  })
  expect(
    server.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(0)
})

it('pauses disk-only, resumes explicitly, sets timeout, and deletes encrypted access', async () => {
  const { client, server, db, options } = fixture()
  await client.create(createInput)
  expect(await client.stop('sandbox-one')).toEqual({
    id: 'sandbox-one',
    state: 'archived',
  })
  expect(await client.get('sandbox-one')).toEqual({
    id: 'sandbox-one',
    state: 'archived',
  })
  const tokens = await db
    .prepare(
      'SELECT ciphertext FROM e2b_traffic_tokens WHERE provider_account = ?',
    )
    .bind(options.accountId)
    .all<{ ciphertext: string }>()
  expect(tokens.results).toHaveLength(1)
  expect(JSON.stringify(tokens.results)).not.toContain(server.trafficToken)
  server.trafficToken = 'rotated-token'
  expect(await client.resume('sandbox-one', {}, 900)).toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
  expect(await client.setAutoStop('sandbox-one', 60)).toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
  expect(
    server.bodies[
      server.requests.findIndex((request) =>
        new URL(request.url).pathname.endsWith('/pause'),
      )
    ],
  ).toEqual({ memory: false })
  expect(
    server.bodies[
      server.requests.findIndex((request) =>
        new URL(request.url).pathname.endsWith('/connect'),
      )
    ],
  ).toEqual({ timeout: 900, memory: false })
  await client.delete('sandbox-one')
  expect(
    await db
      .prepare(
        'SELECT count(*) AS count FROM e2b_traffic_tokens WHERE provider_account = ?',
      )
      .bind(options.accountId)
      .first('count'),
  ).toBe(0)
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'not_found',
  })
})
