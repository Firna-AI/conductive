import { afterAll, beforeAll, expect, it } from 'vitest'

import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import {
  BUCKET_LAYOUT,
  CHUNK_CHARACTERS,
  FILES_KEY,
  bucketKey,
  bucketOf,
} from './bucket-layout'
import { FilesState } from './state'
import { markFilesMoved, readFilesManifest, type FilesStorage } from './storage'
import { legacyChunkKeys } from './stored-chunks'
import {
  fileEntry,
  writeBucketProjection,
  writeOldProjection,
} from './test-support/bucket-builder'
import { observeFilesStorage } from './test-support/observe-storage'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'
import { readStoredFiles } from './test-support/storage-record'

let runtime: FilesStorageHarness
beforeAll(async () => {
  runtime = await createFilesStorage()
})
afterAll(async () => {
  await runtime.dispose()
})

const a = fileEntry('a')
const b = fileEntry('b')
const changes = {
  baseBranch: 'main',
  displayBaseBranch: 'masked-main',
  unpushedCommits: 4,
  files: [
    {
      path: 'b',
      displayPath: 'masked-b',
      previousPath: 'old-b',
      previousDisplayPath: 'masked-old-b',
      change: 'renamed',
      added: 1,
      removed: 0,
      uncommitted: true,
    },
  ],
  summary: { files: 1, added: 1, removed: 0 },
} satisfies ChangesResponse
const projection = {
  connectionId: 'stream',
  hasSnapshot: true,
  tree: { revision: 3, entries: [b, a] },
  changes,
}
const delta = {
  type: 'files.changed',
  delta: {
    revision: 4,
    changes: [
      { operation: 'upsert', entry: { ...a, change: 'modified' } },
      { operation: 'upsert', entry: { ...b, change: 'added' } },
    ],
  },
}

it('converts an old tree and changes during a standalone delta and preserves order and metadata', async () => {
  const name = 'legacy-delta'
  const storage = runtime.storage(name)
  const entry = { ...fileEntry('z'), name: '\\"[}]😀'.repeat(CHUNK_CHARACTERS) }
  const tree = {
    revision: 3,
    entries: [b, entry, a],
    unavailable: true,
  } as const
  const metadata = { nested: [{ escaped: '\\"[}]' }] }
  const oldTree = { metadata, ...tree }
  await writeOldProjection(storage, { ...projection, tree: oldTree })
  await expect(readStoredFiles(storage)).resolves.toStrictEqual({
    ...projection,
    tree,
  })
  const old = await readFilesManifest(storage)
  const oldKeys = [
    ...legacyChunkKeys('tree', old.treeChunks),
    ...legacyChunkKeys('changes', old.changesChunks),
  ]
  expect(oldKeys.length).toBeGreaterThan(2)

  await expect(runtime.apply(name, 'stream', delta)).resolves.toBe(true)
  await runtime.evict(name)
  const manifest = await readFilesManifest(storage)
  expect(manifest).toMatchObject({
    layout: BUCKET_LAYOUT,
    treeChunks: 0,
    changesChunks: 0,
    tree: { fields: { metadata } },
  })
  await expect(storage.getMany(oldKeys)).resolves.toStrictEqual(new Map())
  await expect(readStoredFiles(storage)).resolves.toStrictEqual({
    ...projection,
    tree: {
      revision: 4,
      entries: [{ ...b, change: 'added' }, entry, { ...a, change: 'modified' }],
      unavailable: true,
    },
  })
})

const marks: {
  name: string
  mark: (storage: FilesStorage) => Promise<unknown>
  changes: ChangesResponse | null
}[] = [
  {
    name: 'files.unavailable',
    mark: (storage) =>
      new FilesState(storage).apply('stream', { type: 'files.unavailable' }),
    changes,
  },
  { name: 'markFilesMoved', mark: markFilesMoved, changes: null },
]

it.each(marks)(
  '$name converts the old layout before marking the tree',
  async ({ name, mark, changes }) => {
    const storage = runtime.storage(name)
    await writeOldProjection(storage, projection)
    const observed = observeFilesStorage(storage)
    await mark(observed.storage)
    const changesWrites = observed.writes
      .flatMap(({ updates }) => Object.keys(updates))
      .filter((key) => key.startsWith(`${FILES_KEY}:changes:`))
    expect(changesWrites).toHaveLength(changes === null ? 0 : 2)
    await expect(readFilesManifest(storage)).resolves.toMatchObject({
      layout: BUCKET_LAYOUT,
      treeChunks: 0,
      changesChunks: 0,
    })
    await expect(
      storage.getMany([
        ...legacyChunkKeys('tree', 1),
        ...legacyChunkKeys('changes', 1),
      ]),
    ).resolves.toStrictEqual(new Map())
    await expect(readStoredFiles(storage)).resolves.toStrictEqual({
      ...projection,
      tree: { ...projection.tree, unavailable: true },
      changes,
    })
  },
)

it('keeps a stale delta in the old layout and resets the connection without reading list chunks', async () => {
  const storage = runtime.storage('legacy-connect')
  await writeOldProjection(storage, projection)
  const observed = observeFilesStorage(storage)
  const state = new FilesState(observed.storage)
  await expect(
    state.apply('stream', { ...delta, delta: { ...delta.delta, revision: 3 } }),
  ).resolves.toBe(false)
  expect(observed.writes).toEqual([])
  observed.reads.length = 0
  await state.beginConnection('replacement')
  expect(observed.reads).toEqual([[FILES_KEY]])
  expect(observed.writes).toEqual([
    {
      updates: {
        [FILES_KEY]: {
          connectionId: 'replacement',
          hasSnapshot: false,
          treeChunks: 1,
          changesChunks: 1,
        },
      },
      removals: [],
    },
  ])
  await expect(readStoredFiles(storage)).resolves.toStrictEqual({
    ...projection,
    connectionId: 'replacement',
    hasSnapshot: false,
  })
})

it.each(['old', 'bucket'] as const)(
  'rolls back the %s projection when a standalone apply fails after two bucket puts',
  async (layout) => {
    const name = `abort-${layout}`
    const storage = runtime.storage(name)
    let originalKeys: string[]
    if (layout === 'old') {
      await writeOldProjection(storage, projection)
      originalKeys = [
        FILES_KEY,
        ...legacyChunkKeys('tree', 1),
        ...legacyChunkKeys('changes', 1),
      ]
    } else {
      originalKeys = Object.keys(
        await writeBucketProjection(storage, projection),
      )
    }
    const bucketKeys = [bucketOf(a.path), bucketOf(b.path)]
      .sort((first, second) => first - second)
      .map((bucket) => bucketKey('tree', bucket, 0))
    const keys = [...new Set([...originalKeys, ...bucketKeys])]
    const original = await storage.getMany(keys)

    await expect(runtime.apply(name, 'stream', delta, 2)).rejects.toMatchObject(
      { message: 'Test bucket write failed', keys: bucketKeys },
    )
    await runtime.evict(name)
    await expect(storage.getMany(keys)).resolves.toStrictEqual(original)
    await expect(readStoredFiles(storage)).resolves.toStrictEqual(projection)
    await expect(runtime.inspect(name)).resolves.toMatchObject({
      treeBucketChunks: layout === 'old' ? 0 : 2,
      treeOrderChunks: layout === 'old' ? 0 : 1,
    })
  },
)
