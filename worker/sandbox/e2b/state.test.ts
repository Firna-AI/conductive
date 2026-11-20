import { expect, it } from 'vitest'

import { E2bClient } from './client'
import { createInput, e2bFixture } from './client.test-support'

const fixture = e2bFixture()

it('does not recover another account sandbox with the same request key', async () => {
  const { server, options } = fixture()
  server.sandboxes.set('foreign-sandbox', {
    sandboxID: 'foreign-sandbox',
    state: 'running',
    metadata: {
      conductive_request: 'request-one',
      conductive_account: 'another-account',
    },
  })
  const send = options.fetch
  const client = new E2bClient({
    ...options,
    fetch: async (request) => {
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes'
      )
        throw new Error('ambiguous create')
      return send(request)
    },
  })
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
  })
  expect(
    server.requests.some((request) =>
      new URL(request.url).pathname.endsWith('/connect'),
    ),
  ).toBe(false)
})

it('keeps a completed create independent of a later removed source snapshot', async () => {
  const { client } = fixture()
  await client.create(createInput)
  await client.saveSnapshot('sandbox-one', 'org-image')
  const input = {
    ...createInput,
    idempotencyKey: 'image-child',
    snapshotName: 'org-image',
  }
  await client.create(input)
  await client.deleteSnapshot('org-image')
  await expect(client.create(input)).resolves.toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
})

it('rejects swapped encrypted traffic credentials without exposing their account secrets', async () => {
  const first = fixture()
  const second = fixture()
  await first.client.create(createInput)
  await second.client.create(createInput)
  const ciphertext = await first.db
    .prepare(
      'SELECT ciphertext FROM e2b_traffic_tokens WHERE provider_account = ?',
    )
    .bind(first.options.accountId)
    .first<string>('ciphertext')
  await second.db
    .prepare(
      'UPDATE e2b_traffic_tokens SET ciphertext = ? WHERE provider_account = ?',
    )
    .bind(ciphertext, second.options.accountId)
    .run()
  const result = second.client.create(createInput)
  await expect(result).rejects.toMatchObject({
    kind: 'invalid_response',
    status: 502,
    message: 'The sandbox provider request failed: invalid_response',
  })
  await expect(result).rejects.not.toThrow(second.server.trafficToken)
})

it('keeps an uncertified limit response ambiguous without a second mutation', async () => {
  const { client, server, options } = fixture()
  server.failure = {
    status: 429,
    code: 'sandbox_capacity_unavailable',
    retry: 7,
  }
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'rate_limited',
    providerCode: 'sandbox_capacity_unavailable',
    retryAfterSeconds: 7,
  })
  server.failure = null
  await expect(
    new E2bClient(options).create(createInput),
  ).rejects.toMatchObject({ kind: 'unavailable', status: 503 })
  expect(
    server.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(1)
})

it('traverses create recovery cursors and encodes recovery metadata as an inner query', async () => {
  const { server, options } = fixture()
  server.loseCreate = true
  let pages = 0
  const send = options.fetch
  const client = new E2bClient({
    ...options,
    fetch: async (request) => {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname === '/v2/sandboxes') {
        pages++
        expect(
          new URLSearchParams(url.searchParams.get('metadata') ?? '').get(
            'conductive_request',
          ),
        ).toBe('request&one')
        if (!url.searchParams.has('nextToken'))
          return Response.json([], { headers: { 'X-Next-Token': 'page+two' } })
        expect(url.searchParams.get('nextToken')).toBe('page+two')
      }
      return send(request)
    },
  })
  await expect(
    client.create({ ...createInput, idempotencyKey: 'request&one' }),
  ).resolves.toEqual({ id: 'sandbox-one', state: 'ready' })
  expect(pages).toBe(2)
})
