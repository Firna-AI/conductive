import { expect, it } from 'vitest'

import type { FileEvent } from '../../src/shared/files'
import { changedRow, changesDelta } from '../files/changes-delta.test-support'
import { historyMemory } from './history-memory.test-support'
import { CHAT_META, chatEventKey, chatKey } from './storage-keys'
import { ChatStore } from './store'

it('keeps the newest changes delta and its full list, and removes both on a new full list', async () => {
  const { storage } = historyMemory()
  const store = new ChatStore(storage, () => 25)
  const full = (baseBranch: string): FileEvent => ({
    type: 'changes.updated',
    changes: {
      baseBranch,
      files: [changedRow('file.txt')],
      summary: { files: 1, added: 1, removed: 0 },
    },
  })
  const largeDelta = (revision: number) =>
    changesDelta({
      revision,
      upserts: [
        {
          index: 0,
          file: { ...changedRow('file.txt'), displayPath: 'x'.repeat(70_000) },
        },
      ],
    })
  const append = (event: FileEvent) =>
    store.change(
      'workspace',
      (view) => view.emit(event),
      () => undefined,
    )
  const history = () => store.read('workspace', (view) => view.history(0))
  const first = await append(full('main'))
  const old = await append(largeDelta(2))
  expect(await history()).toEqual({
    events: [first, old],
    throughEventNumber: 2,
  })
  const newest = await append(largeDelta(3))
  expect(await history()).toEqual({
    events: [first, newest],
    throughEventNumber: 3,
  })
  const chunks = async () => [
    ...(await storage.list({ prefix: chatKey('history-chunk', '') })).keys(),
  ]
  expect(await chunks()).toEqual([
    `${chatKey('history-chunk', '')}3:0`,
    `${chatKey('history-chunk', '')}3:1`,
  ])
  const replacement = await append(full('new-main'))
  expect(await history()).toEqual({
    events: [replacement],
    throughEventNumber: 4,
  })
  expect(await chunks()).toEqual([])
})

it('passes a chunked file event with a future type through the history reader', async () => {
  const { storage } = historyMemory()
  const store = new ChatStore(storage, () => 25)
  const envelope = { workspaceId: 'workspace', eventNumber: 1, occurredAt: 25 }
  const event = { type: 'files.future', details: ['file.txt'] }
  await storage.put(CHAT_META, {
    workspaceId: 'workspace',
    through: 1,
    commandThrough: 0,
  })
  await storage.put(chatEventKey(1), { ...envelope, fileEventChunks: 1 })
  await storage.put(`${chatKey('history-chunk', '')}1:0`, JSON.stringify(event))

  await expect(
    store.read('workspace', (view) => view.history(0)),
  ).resolves.toEqual({
    events: [{ ...envelope, event }],
    throughEventNumber: 1,
  })
})
