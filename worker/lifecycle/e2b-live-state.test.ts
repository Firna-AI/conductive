import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { expect, it, onTestFinished } from 'vitest'

import {
  openLiveProvider,
  type LiveProvider,
} from '../../image/e2b/live-provider'
import { FakeE2b } from '../test-support/fake-e2b'

it('reopens the live-check D1 state without another allocation or lost snapshot and traffic credentials', async () => {
  const root = resolve(import.meta.dirname, '../..')
  const parent = join(root, '.context/e2b-live-state-tests')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(join(parent, 'state-'))
  const sessions = new Set<LiveProvider>()
  onTestFinished(async () => {
    await Promise.all([...sessions].map((session) => session.close()))
    await rm(directory, { recursive: true, force: true })
  })
  const server = new FakeE2b()
  const options = {
    accountId: 'e2b-live-check',
    apiKey: server.apiKey,
    domain: server.domain,
    templateId: 'base-template',
    encryptionKey: btoa('e'.repeat(32)),
    fetch: server.fetch,
  }
  const input = {
    idempotencyKey: 'live-check-allocation',
    ttlSeconds: 1800,
    env: {},
  }
  const first = await openLiveProvider(root, directory, options)
  sessions.add(first)
  const sandbox = await first.provider.create(input)
  await first.provider.saveSnapshot(sandbox.id, 'live-check-image')
  await first.close()
  sessions.delete(first)

  const second = await openLiveProvider(root, directory, options)
  sessions.add(second)
  await expect(second.provider.create(input)).resolves.toEqual(sandbox)
  expect(
    server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes',
    ),
  ).toHaveLength(1)
  await expect(
    second.provider.getSnapshot('live-check-image'),
  ).resolves.toEqual({
    name: 'live-check-image',
    sourceSandboxId: sandbox.id,
    status: 'ready',
  })
  await expect(
    second.provider.privatePort(sandbox.id, 3000, 'network'),
  ).resolves.toMatchObject({
    credential: {
      headers: { 'e2b-traffic-access-token': server.trafficToken },
    },
  })
})
