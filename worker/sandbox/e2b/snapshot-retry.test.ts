import { expect, it } from 'vitest'

import {
  createResource,
  type SnapshotResourceIntent,
} from '../../lifecycle/resource-intents'
import { e2bFixture } from './client.test-support'

const fixture = e2bFixture()

it('retries a certified snapshot refusal through its recorded resource intent', async () => {
  const { client, server, db } = fixture()
  server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  const intent: SnapshotResourceIntent = {
    kind: 'snapshot',
    recorded: false,
    input: { sandboxId: 'sandbox-one', name: 'retry-image' },
    persist: async () => {},
  }
  server.failure = {
    status: 429,
    code: 'sandbox_capacity_unavailable',
    shouldRetry: true,
  }
  await expect(createResource(db, client, intent)).rejects.toMatchObject({
    kind: 'rate_limited',
  })
  server.failure = null
  await expect(
    createResource(db, client, { ...intent, recorded: true }),
  ).resolves.toEqual({
    name: 'retry-image',
    sourceSandboxId: 'sandbox-one',
    status: 'ready',
  })
  expect(
    server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname.endsWith('/snapshots'),
    ),
  ).toHaveLength(2)
})

it('tombstones an absent snapshot name before a late save can dispatch', async () => {
  const { client, server } = fixture()
  server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  await client.deleteSnapshot('late-image')
  await expect(
    client.saveSnapshot('sandbox-one', 'late-image'),
  ).rejects.toMatchObject({ kind: 'not_found' })
  expect(
    server.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(0)
})
