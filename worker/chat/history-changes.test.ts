import { expect, it } from 'vitest'
import type { BranchChangedFile } from '../../src/shared/generated/BranchChangedFile'
import type { FileEvent } from '../../src/shared/files'
import { SESSION_INDEX_THROUGH } from './history-session-keys'
import { legacyHistory } from './history-session-index.test-support'
import { nativeChatStore } from './native-store.test-support'
import { grownEntries } from './runner-grown-reports.test-support'
import { chatEventKey, chatKey } from './storage-keys'
import type { ChatStore } from './store'
import type { ChatData } from './types'

const NEWEST_CHANGES = chatKey('history-index', 'changes')
const CHANGES_CUTOVER = chatKey('history-index', 'changes-cutover')
const INDEX_THROUGH = chatKey('history-index', 'through')
const POSITION_THROUGH = chatKey('history-index', 'positions-through')

function changesList(
  baseBranch: string,
  files: readonly BranchChangedFile[] = [],
): FileEvent {
  return {
    type: 'changes.updated',
    changes: {
      baseBranch,
      files,
      summary: { files: files.length, added: files.length, removed: 0 },
    },
  }
}

function tree(revision: number): FileEvent {
  return { type: 'files.snapshot', tree: { revision, entries: [] } }
}

function delta(revision: number, path: string): FileEvent {
  return {
    type: 'files.changed',
    delta: { revision, changes: [{ operation: 'remove', path }] },
  }
}

function append(store: ChatStore, events: readonly FileEvent[]) {
  return store.change(
    'workspace',
    async (transaction) => {
      for (const event of events) await transaction.emit(event)
    },
    () => undefined,
  )
}

function watermarks(data: ChatData) {
  return Promise.all(
    [INDEX_THROUGH, POSITION_THROUGH, SESSION_INDEX_THROUGH].map((key) =>
      data.get<number>(key),
    ),
  )
}

it('replaces a changes list and all its chunks while keeping the tree and deltas', async () => {
  const { storage, store } = await nativeChatStore()
  const files = grownEntries
    .slice(0, 240)
    .map(({ path, displayPath }): BranchChangedFile => ({
      path,
      displayPath,
      change: 'modified',
      added: 1,
      removed: 0,
      uncommitted: true,
    }))
  const firstDelta = delta(2, 'old.txt')
  const newestTree = tree(3)
  const secondDelta = delta(4, 'new.txt')
  const newestChanges = changesList('second')
  await append(store, [
    tree(1),
    changesList('first', files),
    firstDelta,
    newestTree,
    secondDelta,
  ])
  const chunkPrefix = chatKey('history-chunk', '')
  expect((await storage.list({ prefix: chunkPrefix })).size).toBe(19)

  await append(store, [newestChanges])

  const history = await store.read('workspace', (view) => view.history(0))
  expect(history.throughEventNumber).toBe(6)
  expect(history.events.map(({ eventNumber }) => eventNumber)).toEqual([
    3, 4, 5, 6,
  ])
  expect(history.events.map(({ event }) => event)).toEqual([
    firstDelta,
    newestTree,
    secondDelta,
    newestChanges,
  ])
  expect(await storage.get(chatEventKey(2))).toBeUndefined()
  expect((await storage.list({ prefix: chunkPrefix })).size).toBe(0)
  expect(await storage.get(NEWEST_CHANGES)).toBe(6)
})

it.each([
  { history: 'indexed history', indexed: true, sessionRead: false },
  {
    history: 'cold history with a workspace read',
    indexed: false,
    sessionRead: false,
  },
  {
    history: 'cold history with a session read',
    indexed: false,
    sessionRead: true,
  },
])(
  'preserves legacy changes lists in $history after the first new list',
  async ({ indexed, sessionRead }) => {
    const { storage, store } = await nativeChatStore()
    const old = [
      changesList('oldest'),
      changesList('older'),
      changesList('old'),
    ]
    await legacyHistory(storage, old, indexed)
    if (indexed) await storage.put(SESSION_INDEX_THROUGH, 3)

    if (sessionRead) {
      const page = await store.read('workspace', (view) =>
        view.newestHistory('session', undefined, 1),
      )
      expect(page).toEqual({ events: [], throughEventNumber: 1 })
    } else {
      const page = await store.read('workspace', (view) => view.history(0, 1))
      expect(page.events.map(({ event }) => event)).toEqual([old[0]])
    }
    expect(await watermarks(storage)).toEqual(
      indexed ? [3, 3, 3] : [1, 1, sessionRead ? 1 : undefined],
    )

    const firstNew = changesList('first-new')
    await append(store, [firstNew])

    const history = await store.read('workspace', (view) => view.history(0))
    expect(history.events.map(({ event }) => event)).toEqual([...old, firstNew])
    expect(history.throughEventNumber).toBe(4)
    expect(await storage.get(CHANGES_CUTOVER)).toBe(3)
    expect(await storage.get(NEWEST_CHANGES)).toBe(4)
    expect(await watermarks(storage)).toEqual(
      indexed ? [4, 4, 4] : [4, 4, sessionRead ? 1 : undefined],
    )
  },
)
