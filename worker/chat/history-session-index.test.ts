import { expect, it } from 'vitest'
import { heldOperation } from '../test-support/held-operation'
import {
  historySessionKey,
  historySessionPrefix,
  SESSION_INDEX_THROUGH,
} from './history-session-keys'
import {
  legacyHistory,
  sessionAnswer,
} from './history-session-index.test-support'
import { nativeChatStore } from './native-store.test-support'
import { CHAT_EVENT_PREFIX, chatEventKey } from './storage-keys'
import { ChatStore } from './store'

it('loads only the requested session records in bounded forward and newest batches', async () => {
  const { storage, setStorageHooks } = await nativeChatStore()
  const store = new ChatStore(storage, () => 25)
  await store.change(
    'workspace',
    async (view) => {
      for (let number = 1; number <= 35; number++) {
        await view.emit(sessionAnswer(`answer-${number}`))
        await view.emit(sessionAnswer(`other-${number}`, 'other'))
        await view.emit({
          type: 'files.snapshot',
          tree: { revision: number, entries: [] },
        })
      }
      await view.emit({
        type: 'runner.event-refused',
        streamId: 'stream',
        runnerEventNumber: 1,
        runnerEventType: 'unknown',
        reason: 'invalid',
        sessionId: null,
        turnId: null,
      })
    },
    () => undefined,
  )
  expect(await storage.get(historySessionKey('null', 106))).toBeUndefined()
  const lists: DurableObjectListOptions[] = []
  const reads: string[] = []
  let pendingBodies = 0
  let parallelBodies = 0
  await setStorageHooks({
    afterList: async (options) => {
      lists.push(options)
    },
  })
  const readStore = new ChatStore(
    {
      async get<T>(key: string) {
        if (!key.startsWith(CHAT_EVENT_PREFIX)) return storage.get<T>(key)
        reads.push(key)
        pendingBodies++
        parallelBodies = Math.max(parallelBodies, pendingBodies)
        try {
          return await storage.get<T>(key)
        } finally {
          pendingBodies--
        }
      },
      put: (key, value) => storage.put(key, value),
      delete: (key) => storage.delete(key),
      list: (options) => storage.list(options),
      transaction: (work) => storage.transaction(work),
    },
    () => 25,
  )
  const forward = await readStore.read('workspace', (view) =>
    view.history(0, 105, { sessionId: 'session' }),
  )
  expect(parallelBodies).toBe(4)
  expect(forward.events.map(({ eventNumber }) => eventNumber)).toEqual(
    Array.from({ length: 35 }, (_, i) => 1 + i * 3),
  )
  expect(forward.throughEventNumber).toBe(105)
  expect(forward).not.toHaveProperty('hasMore')
  parallelBodies = 0
  const newest = await readStore.read('workspace', (view) =>
    view.newestHistory('session', 103, 104),
  )
  expect(parallelBodies).toBe(4)
  expect(newest.events.map(({ eventNumber }) => eventNumber)).toEqual(
    Array.from({ length: 34 }, (_, i) => 1 + i * 3),
  )
  expect(lists.filter(({ prefix }) => prefix === CHAT_EVENT_PREFIX)).toEqual([])
  expect(
    lists
      .filter(({ prefix }) => prefix === historySessionPrefix('session'))
      .map(({ limit }) => limit),
  ).toEqual(Array.from({ length: 18 }, () => 4))
  expect(reads.sort()).toEqual(
    [
      ...Array.from({ length: 35 }, (_, i) => chatEventKey(1 + i * 3)),
      ...Array.from({ length: 34 }, (_, i) => chatEventKey(100 - i * 3)),
    ].sort(),
  )
})

it('catches up rollback writes before and after a new indexed append', async () => {
  const { storage } = await nativeChatStore()
  const store = new ChatStore(storage, () => 25)
  await store.change(
    'workspace',
    (view) => view.emit(sessionAnswer('first')),
    () => undefined,
  )
  await legacyHistory(storage, [
    sessionAnswer('first'),
    sessionAnswer('rollback'),
    sessionAnswer('other', 'other'),
  ])
  await store.change(
    'workspace',
    (view) => view.emit(sessionAnswer('new')),
    () => undefined,
  )
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBe(1)
  expect(await storage.get(historySessionKey('session', 4))).toBe(4)
  const newest = await store.read('workspace', (view) =>
    view.newestHistory('session'),
  )
  expect(newest.events.map(({ eventNumber }) => eventNumber)).toEqual([1, 2, 4])
  const forward = await store.read('workspace', (view) =>
    view.history(1, 4, { sessionId: 'session' }),
  )
  expect(forward.events.map(({ eventNumber }) => eventNumber)).toEqual([2, 4])
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBe(4)
})

it('resumes a stopped index build without committing progress past missing entries', async () => {
  const { storage, setStorageHooks, clearFaults } = await nativeChatStore()
  await legacyHistory(
    storage,
    Array.from({ length: 10 }, (_, i) => sessionAnswer(`answer-${i}`)),
  )
  const store = new ChatStore(storage, () => 25)
  let batches = 0
  await setStorageHooks({
    beforeCommit: async ({ writes }) => {
      if (writes.includes(SESSION_INDEX_THROUGH) && ++batches === 2)
        throw new Error('Stopped before the second index batch commit')
    },
  })
  await expect(
    store.read('workspace', (view) => view.newestHistory('session')),
  ).rejects.toThrow('Stopped before the second index batch commit')
  await clearFaults()
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBe(4)
  expect(
    (await storage.list({ prefix: historySessionPrefix('session') })).size,
  ).toBe(4)
  const resumed: string[][] = []
  await setStorageHooks({
    afterCommit: async ({ writes }) => {
      if (writes.includes(SESSION_INDEX_THROUGH))
        resumed.push(
          writes.filter((key) =>
            key.startsWith(historySessionPrefix('session')),
          ),
        )
    },
  })
  const restarted = new ChatStore(storage, () => 25)
  const page = await restarted.read('workspace', (view) =>
    view.newestHistory('session'),
  )
  expect(page.events.map(({ eventNumber }) => eventNumber)).toEqual(
    Array.from({ length: 10 }, (_, i) => i + 1),
  )
  expect(resumed).toEqual([
    Array.from({ length: 4 }, (_, i) => historySessionKey('session', i + 5)),
    Array.from({ length: 2 }, (_, i) => historySessionKey('session', i + 9)),
  ])
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBe(10)
})

it('runs queued chat work between committed legacy index batches', async () => {
  const { storage, setStorageHooks, clearFaults } = await nativeChatStore()
  await legacyHistory(
    storage,
    Array.from({ length: 10 }, (_, i) => sessionAnswer(`answer-${i}`)),
  )
  const store = new ChatStore(storage, () => 25)
  const held = heldOperation()
  const progress: number[] = []
  const sizes: number[] = []
  await setStorageHooks({
    afterCommit: async ({ storage: committed, writes }) => {
      if (!writes.includes(SESSION_INDEX_THROUGH)) return
      progress.push((await committed.get<number>(SESSION_INDEX_THROUGH)) ?? -1)
      sizes.push(
        writes.filter((key) => key.startsWith(historySessionPrefix('session')))
          .length,
      )
      if (progress.length === 1) await held.wait()
    },
  })
  const reading = store.run(() =>
    store.read('workspace', (view) => view.newestHistory('session')),
  )
  let queued: Promise<number | undefined> | undefined
  try {
    expect(
      await Promise.race([
        held.entered.then(() => 'batch committed'),
        reading.then(() => 'read finished without a batch'),
      ]),
    ).toBe('batch committed')
    queued = store.run(async () => {
      const through = await storage.get<number>(SESSION_INDEX_THROUGH)
      await store.change(
        'workspace',
        (view) => view.emit(sessionAnswer('after-cutoff')),
        () => undefined,
      )
      return through
    })
    held.release()
    const page = await reading
    expect(await queued).toBe(4)
    expect(page.events.map(({ eventNumber }) => eventNumber)).toEqual(
      Array.from({ length: 10 }, (_, i) => i + 1),
    )
    expect(progress).toEqual([4, 8, 10])
    expect(sizes).toEqual([4, 4, 2])
    const next = await store.run(() =>
      store.read('workspace', (view) => view.newestHistory('session')),
    )
    expect(next.events.map(({ eventNumber }) => eventNumber)).toEqual(
      Array.from({ length: 11 }, (_, i) => i + 1),
    )
  } finally {
    held.release()
    await clearFaults()
    await reading
    await queued
  }
})
