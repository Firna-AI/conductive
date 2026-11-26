import { Buffer } from 'node:buffer'

import { expect, it, vi } from 'vitest'
import type { FileEvent } from '../../src/shared/files'
import type { FileEntry } from '../../src/shared/generated/FileEntry'
import { HistoryPages } from './history-pages'
import { SESSION_INDEX_THROUGH } from './history-session-keys'
import {
  legacyHistory,
  sessionAnswer,
} from './history-session-index.test-support'
import { nativeChatStore } from './native-store.test-support'
import { CHAT_EVENT_PREFIX, chatEventKey, chatKey } from './storage-keys'
import { ChatStore } from './store'
import type { ChatData } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

const CHUNK_PREFIX = chatKey('history-chunk', '')

function sizedDelta(suffix: string): FileEvent {
  return {
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path: 'quoted.txt',
            name: '🙂"\\\n' + 'x'.repeat(3_868) + suffix,
            kind: 'file',
            change: null,
          },
        },
      ],
    },
  }
}

it('replays published file events stored inline at 4,096 bytes and chunked at 4,097 bytes', async () => {
  const { actor, storage } = await nativeChatStore()
  const inline = {
    workspaceId: 'workspace',
    eventNumber: 1,
    occurredAt: 25,
    event: sizedDelta(''),
  }
  const chunked = { ...inline, eventNumber: 2, event: sizedDelta('x') }
  expect(Buffer.byteLength(JSON.stringify(inline))).toBe(4_096)
  expect(Buffer.byteLength(JSON.stringify(chunked))).toBe(4_097)

  for (const { event } of [inline, chunked])
    await actor.api.controls.emitEvent('workspace', event)

  expect(await storage.get(chatEventKey(1))).toEqual(inline)
  expect(await storage.get(chatEventKey(2))).toEqual({
    workspaceId: 'workspace',
    eventNumber: 2,
    occurredAt: 25,
    fileEventChunks: 1,
  })
  expect([...(await storage.list({ prefix: CHUNK_PREFIX })).values()]).toEqual([
    JSON.stringify(chunked.event),
  ])
  const published = await actor.api.controls.takePublications()
  expect(published).toEqual([inline, chunked])
  await actor.restart()
  expect(await actor.api.controls.history('workspace')).toEqual({
    events: published,
    throughEventNumber: 2,
  })
})

it('skips file stubs during session preparation with compaction ready and during warm reads', async () => {
  const { storage, setStorageHooks } = await nativeChatStore()
  await legacyHistory(storage, [
    sessionAnswer('answer'),
    sizedDelta('x'),
    sessionAnswer('another answer', 'other'),
  ])
  expect(await storage.get(chatEventKey(2))).toEqual({
    workspaceId: 'workspace',
    eventNumber: 2,
    occurredAt: 25,
    fileEventChunks: 1,
  })
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBeUndefined()

  const reads: string[] = []
  const workspaceLists: DurableObjectListOptions[] = []
  await setStorageHooks({
    afterRead: async (key) => {
      if (key.startsWith(CHUNK_PREFIX) || key.startsWith(CHAT_EVENT_PREFIX))
        reads.push(key)
    },
    afterList: async (options) => {
      if (options.prefix === CHAT_EVENT_PREFIX) workspaceLists.push(options)
    },
  })
  const pages = new HistoryPages(storage)
  const newest = await pages.readNewest(undefined, 3, { sessionId: 'session' })
  expect(newest.events.map(({ eventNumber }) => eventNumber)).toEqual([1])
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBe(3)
  expect(workspaceLists).toHaveLength(1)
  expect(reads).toEqual([chatEventKey(1)])

  reads.length = 0
  workspaceLists.length = 0
  expect(await pages.read(0, 3, { sessionId: 'session' })).toEqual(newest)
  expect(reads).toEqual([chatEventKey(1)])
  expect(workspaceLists).toEqual([])
})

it('stores and publishes the same deeply frozen file events and copies other events', async () => {
  const put = vi.fn<ChatData['put']>(async () => undefined)
  const data: ChatData = {
    get: async () => undefined,
    put,
    delete: async () => false,
    list: async () => new Map(),
  }
  const store = new ChatStore(
    { ...data, transaction: (work) => work(data) },
    () => 25,
  )
  const entry: FileEntry = {
    path: 'file.txt',
    name: 'file.txt',
    kind: 'file',
    change: null,
  }
  const tree: FileEvent = {
    type: 'files.snapshot',
    tree: { revision: 1, entries: [entry] },
  }
  const removal = { operation: 'remove' as const, path: 'file.txt' }
  const delta: FileEvent = {
    type: 'files.changed',
    delta: { revision: 2, changes: [removal] },
  }
  const summary = { files: 0, added: 0, removed: 0 }
  const changes: FileEvent = {
    type: 'changes.updated',
    changes: { baseBranch: 'main', files: [], summary },
  }
  const other = {
    type: 'assistant.completed' as const,
    sessionId: 'session',
    turnId: 'turn',
    messageId: 'answer',
    text: 'Answer',
    userMessageIds: ['prompt'],
  }
  const fileEvents = [tree, delta, changes]
  const published: WorkspaceEventEnvelope[] = []
  const emitted = await store.change(
    'workspace',
    async (view) => {
      const envelopes = []
      for (const event of [...fileEvents, other])
        envelopes.push(await view.emit(event))
      other.userMessageIds.push('late')
      return envelopes
    },
    (events) => published.push(...events),
  )

  for (const [index, event] of fileEvents.entries()) {
    expect(emitted[index]?.event).toBe(event)
    expect(published[index]?.event).toBe(event)
    expect(
      put.mock.calls.find(([key]) => key === chatEventKey(index + 1))?.[1],
    ).toBe(emitted[index])
    expect(Object.isFrozen(event)).toBe(true)
  }
  expect(Object.isFrozen(tree.tree.entries)).toBe(true)
  expect(() => {
    entry.name = 'changed'
  }).toThrow(TypeError)
  expect(() => {
    removal.path = 'changed'
  }).toThrow(TypeError)
  expect(() => {
    summary.added = 1
  }).toThrow(TypeError)
  expect(published[3]?.event).not.toBe(other)
  expect(published[3]?.event).toEqual({ ...other, userMessageIds: ['prompt'] })
})
