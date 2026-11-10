import { expect, it } from 'vitest'

import { providerForAccount } from '../client'
import { e2bFixture } from './client.test-support'
import { E2bClient } from './client'

const fixture = e2bFixture()

it('keeps the identity-only cleanup client from invoking resume or guest commands', async () => {
  const { options, server } = fixture()
  const client = new E2bClient({ ...options, allocationMode: 'cleanup' })
  await expect(client.resume('sandbox-one', {}, 60)).rejects.toMatchObject({
    kind: 'unavailable',
    status: 501,
  })
  await expect(
    client.runCommand('sandbox-one', 'must not run'),
  ).rejects.toMatchObject({ kind: 'unavailable', status: 501 })
  expect(server.requests).toHaveLength(0)
})

it('composes the configured E2B account without sending the pinned Boat credentials', async () => {
  const { server, options } = fixture()
  server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  const client = providerForAccount(
    {
      BOAT_API_KEY: 'boat-only-key',
      BOAT_ORG_ID: 'boat-only-org',
      DB: options.db,
      BOAT_KEY_ENCRYPTION_KEY: options.encryptionKey,
      SANDBOX_PROVIDER_ACCOUNTS: JSON.stringify({
        e2b: {
          kind: 'e2b',
          apiKey: server.apiKey,
          domain: server.domain,
          templateId: options.templateId,
        },
      }),
    },
    server.fetch,
    'e2b',
  )
  expect(await client.get('sandbox-one')).toEqual({
    id: 'sandbox-one',
    state: 'ready',
  })
  expect(
    server.requests.map((request) => [
      request.url,
      request.headers.get('X-API-Key'),
      request.headers.get('Authorization'),
      request.headers.get('X-Boat-Org'),
    ]),
  ).toEqual([
    [
      'https://api.eu.e2b.test/sandboxes/sandbox-one',
      server.apiKey,
      null,
      null,
    ],
  ])
})

it('rejects desktop and fork asynchronously without a provider request', async () => {
  const { client, server } = fixture()
  for (const invoke of [
    () => client.desktop('sandbox-one'),
    () =>
      client.fork('sandbox-one', {
        ttlSeconds: 60,
        idempotencyKey: 'fork-one',
      }),
  ]) {
    let operation: Promise<unknown> | undefined
    expect(() => {
      operation = invoke()
      void operation.catch(() => undefined)
    }).not.toThrow()
    expect(operation).toBeInstanceOf(Promise)
    await expect(operation).rejects.toMatchObject({
      kind: 'unavailable',
      status: 501,
      providerCode: 'unsupported_operation',
    })
  }
  expect(server.requests).toHaveLength(0)
})
