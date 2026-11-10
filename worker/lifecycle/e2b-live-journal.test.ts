import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { ProviderError } from '../sandbox/errors'
import { liveJournalFixture } from './e2b-live-journal-test-support'

it('clears proved absent and known deleted journal entries after state reopen without allocating', async () => {
  const fixture = await liveJournalFixture()
  fixture.behavior.refuseCreate = true
  await expect(
    fixture.journal.create(fixture.session.provider, 'refused'),
  ).rejects.toMatchObject({ kind: 'rate_limited', status: 429 })
  await fixture.reopen()
  fixture.behavior.refuseCreate = false
  const before = fixture.requests.length
  await expect(
    fixture.journal.cleanup(fixture.session.cleanupProvider),
  ).resolves.toEqual([])
  expect(
    fixture.requests
      .slice(before)
      .every(
        (request) => request.method === 'GET' || request.method === 'DELETE',
      ),
  ).toBe(true)
  const key = fixture.journal.entries[0]
  if (key.kind !== 'sandbox')
    throw new Error('Expected the allocation journal entry.')
  await expect(
    fixture.session.provider.create({
      idempotencyKey: key.key,
      ttlSeconds: 1800,
    }),
  ).rejects.toMatchObject({ kind: 'not_found', status: 404 })
  expect(
    fixture.requests
      .slice(before)
      .every(
        (request) => request.method === 'GET' || request.method === 'DELETE',
      ),
  ).toBe(true)
  const id = await fixture.journal.create(fixture.session.provider, 'known')
  const name = await fixture.journal.snapshot(
    fixture.session.provider,
    id,
    'known-image',
  )
  await fixture.session.provider.delete(id)
  await fixture.session.provider.deleteSnapshot(name)
  const deleted: string[] = []
  const beforeKnownCleanup = fixture.requests.length
  await expect(
    fixture.journal.cleanup({
      create: (input) => fixture.session.cleanupProvider.create(input),
      delete: async (sandboxId) => {
        deleted.push(sandboxId)
        throw new ProviderError('not_found', 404)
      },
      deleteSnapshot: async (snapshotName) => {
        deleted.push(snapshotName)
        throw new ProviderError('not_found', 404)
      },
    }),
  ).resolves.toEqual([])
  expect(deleted).toEqual([name, id])
  expect(
    fixture.requests
      .slice(beforeKnownCleanup)
      .every(
        (request) => request.method === 'GET' || request.method === 'DELETE',
      ),
  ).toBe(true)
})

it('retains an unknown allocation until identity-only cleanup finds and deletes it after state reopen', async () => {
  const fixture = await liveJournalFixture()
  fixture.server.loseCreate = true
  fixture.behavior.hideInventory = true
  await expect(
    fixture.journal.create(fixture.session.provider, 'unknown'),
  ).rejects.toMatchObject({ kind: 'unavailable', status: 503 })
  const [allocated] = fixture.server.sandboxes.values()
  if (!allocated)
    throw new Error('Expected a fake allocation after the lost reply.')
  await fixture.reopen()
  const entry = fixture.journal.entries[0]
  if (entry.kind !== 'sandbox')
    throw new Error('Expected the allocation journal entry.')
  const key = entry.key
  const before = fixture.requests.length
  const pending = await fixture.journal.cleanup(fixture.session.cleanupProvider)
  expect(pending).toHaveLength(1)
  expect(pending[0]).toMatchObject({ kind: 'sandbox', id: null })
  await expect(
    fixture.journal.cleanup({
      create: async () => {
        throw new ProviderError('not_found', 404)
      },
      delete: (id) => fixture.session.cleanupProvider.delete(id),
      deleteSnapshot: (name) =>
        fixture.session.cleanupProvider.deleteSnapshot(name),
    }),
  ).resolves.toHaveLength(1)
  fixture.behavior.hideInventory = false
  fixture.behavior.inventoryNotFound = true
  await expect(
    fixture.journal.cleanup(fixture.session.cleanupProvider),
  ).resolves.toHaveLength(1)
  fixture.behavior.inventoryNotFound = false
  await expect(
    fixture.journal.cleanup(fixture.session.cleanupProvider),
  ).resolves.toEqual([])
  expect(fixture.server.sandboxes.size).toBe(0)
  expect(
    fixture.requests
      .slice(before)
      .every(
        (request) => request.method === 'GET' || request.method === 'DELETE',
      ),
  ).toBe(true)
  const recorded: unknown = JSON.parse(
    await readFile(join(fixture.config.output, 'resources.json'), 'utf8'),
  )
  expect(recorded).toEqual([{ kind: 'sandbox', key, id: allocated.sandboxID }])
})
