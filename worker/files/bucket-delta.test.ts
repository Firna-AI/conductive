import { afterAll, beforeAll, expect, it } from 'vitest'

import type { FileEntry } from '../../src/shared/generated/FileEntry'
import type { FileTreeChange } from '../../src/shared/generated/FileTreeChange'
import type { FileTreeDelta } from '../../src/shared/generated/FileTreeDelta'
import {
  BUCKET_COUNT,
  FILES_KEY,
  bucketKey,
  bucketOf,
  orderKey,
} from './bucket-layout'
import { FilesState } from './state'
import { fileEntry, writeBucketProjection } from './test-support/bucket-builder'
import { observeFilesStorage } from './test-support/observe-storage'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'
import { readStoredTreeFields } from './test-support/storage-record'

let runtime: FilesStorageHarness
beforeAll(async () => {
  runtime = await createFilesStorage()
})
afterAll(async () => {
  await runtime.dispose()
})

async function treeProjection(name: string, entries: FileEntry[]) {
  const storage = runtime.storage(name)
  await writeBucketProjection(storage, {
    connectionId: 'stream',
    hasSnapshot: true,
    tree: { revision: 1, entries },
    changes: null,
  })
  const observed = observeFilesStorage(storage)
  const state = new FilesState(observed.storage)
  return {
    storage,
    observed,
    apply: (
      changes: FileTreeChange[],
      revision = 2,
      metadata: Pick<FileTreeDelta, 'omittedEntryCount'> = {},
    ) =>
      state.apply('stream', {
        type: 'files.changed',
        delta: { revision, changes, ...metadata },
      }),
    tree: () => new FilesState(storage).tree(),
  }
}

const a = fileEntry('a')
const b = fileEntry('b')
const z = fileEntry('z')
const modifiedA: FileEntry = { ...a, change: 'modified' }
const modifiedB: FileEntry = { ...b, displayPath: 'masked', change: 'renamed' }

it('binds counted deltas including zero and advances the count revision on an uncounted delta', async () => {
  const { storage, observed, apply, tree } = await treeProjection(
    'count-only',
    [a, b],
  )
  await expect(tree()).resolves.toStrictEqual({ revision: 1, entries: [a, b] })
  await expect(apply([], 2, { omittedEntryCount: 29 })).resolves.toBe(true)
  expect(observed.reads).toStrictEqual([[FILES_KEY]])
  expect(observed.writes).toHaveLength(1)
  expect(Object.keys(observed.writes[0].updates)).toEqual([FILES_KEY])
  expect(observed.writes[0].removals).toEqual([])
  await expect(readStoredTreeFields(storage)).resolves.toStrictEqual({
    revision: 2,
    omittedEntryCount: 29,
    omittedEntryCountRevision: 2,
  })
  await expect(tree()).resolves.toStrictEqual({
    revision: 2,
    omittedEntryCount: 29,
    entries: [a, b],
  })
  await expect(
    apply([{ operation: 'upsert', entry: modifiedA }], 3),
  ).resolves.toBe(true)
  await expect(readStoredTreeFields(storage)).resolves.toStrictEqual({
    revision: 3,
    omittedEntryCount: 29,
    omittedEntryCountRevision: 3,
  })
  await expect(tree()).resolves.toStrictEqual({
    revision: 3,
    omittedEntryCount: 29,
    entries: [modifiedA, b],
  })
  await expect(apply([], 4, { omittedEntryCount: 0 })).resolves.toBe(true)
  await expect(readStoredTreeFields(storage)).resolves.toStrictEqual({
    revision: 4,
    omittedEntryCount: 0,
    omittedEntryCountRevision: 4,
  })
  await expect(tree()).resolves.toStrictEqual({
    revision: 4,
    omittedEntryCount: 0,
    entries: [modifiedA, b],
  })
})

it('reads and writes only the two affected buckets for existing upserts and updates order on insertion', async () => {
  const { observed, apply, tree } = await treeProjection('upserts', [z, a, b])
  const affected = [a, b].map(({ path }) =>
    bucketKey('tree', bucketOf(path), 0),
  )
  await expect(
    apply([
      { operation: 'upsert', entry: modifiedB },
      { operation: 'upsert', entry: modifiedA },
    ]),
  ).resolves.toBe(true)
  expect(observed.reads.flat().sort()).toEqual([FILES_KEY, ...affected].sort())
  expect(observed.writes).toHaveLength(1)
  expect(Object.keys(observed.writes[0].updates).sort()).toEqual(
    [FILES_KEY, ...affected].sort(),
  )
  expect(observed.writes[0].removals).toEqual([])
  await expect(tree()).resolves.toStrictEqual({
    revision: 2,
    entries: [z, modifiedA, modifiedB],
  })

  observed.reads.length = 0
  observed.writes.length = 0
  const inserted = fileEntry('!')
  const order = orderKey('tree', 0)
  const affectedOnInsert = [FILES_KEY, affected[0], order].sort()
  await expect(
    apply([{ operation: 'upsert', entry: inserted }], 3),
  ).resolves.toBe(true)
  expect(observed.reads.flat().sort()).toEqual(affectedOnInsert)
  expect(observed.writes).toHaveLength(1)
  expect(Object.keys(observed.writes[0].updates).sort()).toEqual(
    affectedOnInsert,
  )
  expect(observed.writes[0].removals).toEqual([])
  await expect(tree()).resolves.toStrictEqual({
    revision: 3,
    entries: [z, modifiedA, modifiedB, inserted],
  })
})

function folderInEveryBucket(): FileEntry[] {
  const entries = new Map<number, FileEntry>()
  for (let index = 0; entries.size < BUCKET_COUNT; index++) {
    const entry = fileEntry(`folder/file-${index}`)
    entries.set(bucketOf(entry.path), entry)
  }
  return [...entries.values()]
}

it('reads each tree bucket once in order when a folder is removed', async () => {
  const keeper = fileEntry('folder-neighbor/file')
  const { observed, apply, tree } = await treeProjection('remove-folder', [
    ...folderInEveryBucket(),
    keeper,
  ])
  await expect(apply([{ operation: 'remove', path: 'folder' }])).resolves.toBe(
    true,
  )
  expect(observed.reads).toStrictEqual([
    [FILES_KEY],
    ...Array.from({ length: BUCKET_COUNT }, (_, bucket) => [
      bucketKey('tree', bucket, 0),
    ]),
    [orderKey('tree', 0)],
  ])
  expect(observed.maxConcurrentReads).toBe(1)
  expect(observed.writes).toHaveLength(1)
  await expect(tree()).resolves.toStrictEqual({
    revision: 2,
    entries: [keeper],
  })
})

const folder = { ...fileEntry('dir'), kind: 'directory' } satisfies FileEntry
const leaf = fileEntry('dir/leaf')
const neighbor = fileEntry('dir-neighbor')
const initial = [z, a, folder, leaf, b, neighbor]
const sequences: {
  name: string
  changes: FileTreeChange[]
  expected: FileEntry[]
}[] = [
  {
    name: 'a remove and then an upsert of the same path',
    changes: [
      { operation: 'remove', path: 'a' },
      { operation: 'upsert', entry: modifiedA },
    ],
    expected: [z, folder, leaf, b, neighbor, modifiedA],
  },
  {
    name: 'an upsert and then a remove of its folder',
    changes: [
      { operation: 'upsert', entry: fileEntry('dir/new') },
      { operation: 'remove', path: 'dir' },
    ],
    expected: [z, a, b, neighbor],
  },
  {
    name: 'a move onto an existing path',
    changes: [{ operation: 'move', previousPath: 'a', entry: modifiedB }],
    expected: [z, folder, leaf, modifiedB, neighbor],
  },
  {
    name: 'a move and then a new item at the old path',
    changes: [
      { operation: 'move', previousPath: 'a', entry: fileEntry('c') },
      { operation: 'upsert', entry: modifiedA },
    ],
    expected: [z, folder, leaf, b, neighbor, fileEntry('c'), modifiedA],
  },
]

it.each(sequences)(
  'keeps Map order after $name',
  async ({ name, changes, expected }) => {
    const { apply, tree } = await treeProjection(name, initial)
    await expect(apply(changes)).resolves.toBe(true)
    await expect(tree()).resolves.toStrictEqual({
      revision: 2,
      entries: expected,
    })
  },
)
