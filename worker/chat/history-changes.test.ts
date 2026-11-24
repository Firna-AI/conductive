import { expect, it } from 'vitest'
import type { BranchChangedFile } from '../../src/shared/generated/BranchChangedFile'
import type { FileEvent } from '../../src/shared/files'
import { checkCommitBoundaries } from './commit-boundary.test-support'
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

it('replaces a changes list and its chunks in one commit while keeping the tree and deltas', async () => {
  await checkCommitBoundaries(async () => {
    const { actor, storage, store, failNextCommit, clearFaults } =
      await nativeChatStore()
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
    const oldChanges = changesList('first', files)
    const newestChanges = changesList('second')
    const retained = [delta(2, 'old.txt'), tree(3), delta(4, 'new.txt')]
    await append(store, [tree(1), oldChanges, ...retained])

    const chunkPrefix = chatKey('history-chunk', '')
    return {
      failNextCommit,
      clearFaults,
      action: async (error) => {
        await expect(append(store, [newestChanges])).rejects.toThrow(error)
      },
      read: async () => {
        const history = await store.read('workspace', (view) => view.history(0))
        return {
          through: history.throughEventNumber,
          eventNumbers: history.events.map(({ eventNumber }) => eventNumber),
          events: history.events.map(({ event }) => event),
          latestChanges: await storage.get(NEWEST_CHANGES),
          hasOldEvent: (await storage.get(chatEventKey(2))) !== undefined,
          chunks: (await storage.list({ prefix: chunkPrefix })).size,
        }
      },
      before: {
        through: 5,
        eventNumbers: [2, 3, 4, 5],
        events: [oldChanges, ...retained],
        latestChanges: 2,
        hasOldEvent: true,
        chunks: 19,
      },
      after: {
        through: 6,
        eventNumbers: [3, 4, 5, 6],
        events: [...retained, newestChanges],
        latestChanges: 6,
        hasOldEvent: false,
        chunks: 0,
      },
      restart: actor.crash,
    }
  })
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
