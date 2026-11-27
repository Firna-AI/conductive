import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import {
  FILES_KEY,
  bucketKey,
  bucketOf,
  orderKey,
} from '../files/bucket-layout'
import {
  changedRow,
  changesDelta,
  fullChanges,
} from '../files/changes-delta.test-support'
import { readFilesManifest } from '../files/storage'
import { createHarness, type TestHarness } from '../test-support/harness'
import { chatFilesStorage } from './files-storage'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { refreshCommands, refusedEvents } from './runner-repairs.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

const edited = changedRow('file.txt')
const untouched = changedRow('other.txt')
const listed = [edited, untouched]
const summary = { files: 2, added: 2, removed: 0 }
const initial = fullChanges({ files: listed, summary })
const delta = changesDelta({
  upserts: [{ index: 0, file: changedRow(edited.path, 3) }],
  summary: { files: 2, added: 4, removed: 0 },
})
const editedBucket = bucketOf(edited.path)
const editedChunk = bucketKey('changes', editedBucket, 0)
const orderChunk = orderKey('changes', 0)

const damageCases = [
  {
    damage: 'missing order chunk',
    set: async (storage: DurableObjectStorage) => storage.delete(orderChunk),
  },
  {
    damage: 'missing touched bucket chunk',
    set: async (storage: DurableObjectStorage) => storage.delete(editedChunk),
  },
  {
    damage: 'missing untouched bucket chunk',
    set: async (storage: DurableObjectStorage) =>
      storage.delete(bucketKey('changes', bucketOf(untouched.path), 0)),
  },
  {
    damage: 'malformed bucket digest',
    async set(storage: DurableObjectStorage) {
      const manifest = await readFilesManifest(chatFilesStorage(storage))
      if (manifest.layout !== 'buckets' || !manifest.changes)
        throw new Error('Expected a saved changes list.')
      manifest.changes.buckets[editedBucket].digest = 'bad'
      await storage.put(FILES_KEY, manifest)
    },
  },
  {
    damage: 'incorrect bucket digest',
    set: (storage: DurableObjectStorage) =>
      storage.put(editedChunk, JSON.stringify([changedRow(edited.path, 2)])),
  },
  {
    damage: 'unparseable bucket',
    set: (storage: DurableObjectStorage) => storage.put(editedChunk, '{'),
  },
]

it.each(damageCases)(
  'refuses a changes delta for $damage and rebuilds the list',
  async ({ set }) => {
    const fixture = await createChatFixture(harness)
    const runner = await fixture.connect()
    runner.emit(initial)
    await fixture.drain()
    const request = fixture.request(
      workspaceEventsPath(fixture.org.id, WORKSPACE_ID),
    )
    const olderUrl = new URL(request.url)
    olderUrl.searchParams.delete('forms')
    await fixture.actor.api.peers.openBrowser('older', {
      url: olderUrl.href,
      headers: Object.fromEntries(request.headers),
    })
    await set(fixture.storage)

    const refused = runner.emit(delta)
    await fixture.drain()
    const marker = {
      type: 'runner.event-refused',
      reason: 'invalid',
      runnerEventNumber: 2,
      runnerEventType: 'changes.changed',
      streamId: refused.streamId,
      sessionId: null,
      turnId: null,
    }
    expect(await refusedEvents(fixture)).toEqual([marker])
    expect(refreshCommands(runner)).toEqual([
      {
        type: 'report.refresh',
        commandId: expect.any(String),
        kind: 'changes.updated',
      },
    ])
    expect(runner.received.at(-1)).toEqual({
      type: 'confirm',
      streamId: refused.streamId,
      throughEventNumber: 2,
    })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.cursor(refused.streamId),
      ),
    ).toBe(2)
    await expect(
      fixture.actor.api.controls.fileProjection('changes'),
    ).resolves.toBeNull()

    runner.emit(fullChanges({ revision: 3, files: listed, summary }))
    await fixture.drain()
    expect(runner.received.at(-1)).toEqual({
      type: 'confirm',
      streamId: refused.streamId,
      throughEventNumber: 3,
    })
    const rebuilt = { revision: 3, baseBranch: 'main', files: listed, summary }
    await expect(
      fixture.actor.api.controls.fileProjection('changes'),
    ).resolves.toEqual(rebuilt)
    expect(refreshCommands(runner)).toHaveLength(1)
    const older = await fixture.actor.api.peers.take('older')
    expect(older.closed).toBe(0)
    expect(older.messages).toEqual([
      expect.objectContaining({ type: 'history' }),
      {
        type: 'event',
        envelope: expect.objectContaining({ event: marker }),
      },
      {
        type: 'event',
        envelope: expect.objectContaining({
          event: { type: 'changes.updated', changes: rebuilt },
        }),
      },
    ])
  },
)

it('keeps a damaged changes list and leaves its delta unconfirmed when the repair commit fails', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect()
  runner.emit(initial)
  await fixture.drain()
  await fixture.storage.delete(orderChunk)
  const before = await fixture.storage.list({ prefix: FILES_KEY })
  const streamId = 'fake-stream-1'
  await fixture.setStorageHooks({
    beforeCommit: async (staged) => {
      if (
        (await staged.read(WORKSPACE_ID, (view) => view.cursor(streamId))) === 2
      )
        throw new Error('Injected storage failure')
    },
  })
  runner.emit(delta)
  await expect(fixture.drain()).rejects.toThrow('Injected storage failure')
  await expect(fixture.storage.list({ prefix: FILES_KEY })).resolves.toEqual(
    before,
  )
  expect(await refusedEvents(fixture)).toEqual([])
  expect(refreshCommands(runner)).toEqual([])
  expect(runner.pendingEvents().map(({ eventNumber }) => eventNumber)).toEqual([
    2,
  ])
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.cursor(streamId),
    ),
  ).toBe(1)
})
