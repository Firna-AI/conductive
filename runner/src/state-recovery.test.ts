import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, onTestFinished, vi } from 'vitest'

import { DiskStorage, EventStore } from './state'

it('saves the complete pending state after one rejected write and keeps event numbers contiguous', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-state-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  const storage = new DiskStorage(join(directory, 'state.json'))
  const write = storage.write.bind(storage)
  let fail = false
  const error = new Error('The disk is full.')
  vi.spyOn(storage, 'write').mockImplementation(async (state) => {
    if (fail) {
      fail = false
      throw error
    }
    await write(state)
  })
  const store = await EventStore.open(storage)
  fail = true
  await expect(
    store.append({ type: 'workspace.title', name: 'First' }, 100),
  ).rejects.toBe(error)
  expect(store.snapshot.outbox).toEqual([])
  expect(store.snapshot.nextEventNumber).toBe(1)

  await expect(
    store.remember({
      sessionId: 'session-1',
      agent: 'claude',
      providerSessionId: 'saved-conversation',
    }),
  ).resolves.toBeUndefined()
  await store.append({ type: 'workspace.title', name: 'Second' }, 100)
  expect(
    store.snapshot.outbox.map(({ eventNumber, event }) => [eventNumber, event]),
  ).toEqual([
    [1, { type: 'workspace.title', name: 'First' }],
    [2, { type: 'workspace.title', name: 'Second' }],
  ])
  expect(store.snapshot.sessions).toEqual([
    {
      sessionId: 'session-1',
      agent: 'claude',
      providerSessionId: 'saved-conversation',
    },
  ])
  fail = true
  await expect(store.confirm(1)).rejects.toBe(error)
  expect(store.snapshot.confirmedThrough).toBe(0)
  await store.append({ type: 'workspace.title', name: 'Third' }, 100)
  expect(store.snapshot.confirmedThrough).toBe(1)
  expect(store.snapshot.nextEventNumber).toBe(4)
  expect(store.snapshot.outbox.map(({ eventNumber }) => eventNumber)).toEqual([
    2, 3,
  ])
  expect((await EventStore.open(storage)).snapshot).toEqual(store.snapshot)
})
