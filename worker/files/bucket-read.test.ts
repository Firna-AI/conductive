import { afterAll, beforeAll, expect, it } from 'vitest'

import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import { isRecord } from '../http'
import { FILES_KEY, bucketDigest, bucketOf } from './bucket-layout'
import { FilesState } from './state'
import {
  fileEntry,
  writeBucketProjection,
  writeOldProjection,
} from './test-support/bucket-builder'
import {
  compatibilityChangesBuckets,
  compatibilityProjection,
  compatibilityRecord,
  compatibilityTreeBuckets,
} from './test-support/bucket-record'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'
import {
  readStoredFiles,
  writeStorageRecord,
  type StoredFiles,
} from './test-support/storage-record'

let runtime: FilesStorageHarness
beforeAll(async () => {
  runtime = await createFilesStorage()
})
afterAll(async () => {
  await runtime.dispose()
})

const changes = {
  baseBranch: 'main',
  displayBaseBranch: 'display-main',
  unpushedCommits: 3,
  uncommittedFileCount: 1,
  files: [
    {
      path: 'm',
      previousPath: 'old-m',
      change: 'renamed',
      added: 1,
      removed: 2,
      uncommitted: false,
    },
    { path: 'a', change: 'added', added: 4, removed: 0, uncommitted: true },
  ],
  summary: { files: 2, added: 5, removed: 2 },
} satisfies ChangesResponse

const projection: StoredFiles = {
  connectionId: 'stream',
  hasSnapshot: true,
  tree: { revision: 3, entries: [fileEntry('a')] },
  changes,
}

it('uses UTF-8 for bucket numbers and SHA-256 digests', async () => {
  expect(bucketOf('src/é.ts')).toBe(13)
  await expect(bucketDigest('src/é.ts')).resolves.toBe(
    'f73116c0f5d036b78171d1abd8438b19af15f158d29b0f0782625879eba391c4',
  )
  await expect(bucketDigest('[]')).resolves.toBe(
    '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  )
})

it('reads the literal record across all 64 buckets', async () => {
  const storage = runtime.storage('literal-bucket-record')
  await writeStorageRecord(storage, compatibilityRecord)

  await expect(readStoredFiles(storage)).resolves.toStrictEqual(
    compatibilityProjection,
  )
  const state = new FilesState(storage)
  await expect(state.tree()).resolves.toStrictEqual(
    compatibilityProjection.tree,
  )
  await expect(state.changes()).resolves.toStrictEqual(
    compatibilityProjection.changes,
  )
  expect(
    compatibilityProjection.tree.entries.map(({ path }) => bucketOf(path)),
  ).toEqual(compatibilityTreeBuckets)
  expect(
    compatibilityProjection.changes.files.map(({ path }) => bucketOf(path)),
  ).toEqual(compatibilityChangesBuckets)
})

it('reads list order, split bucket JSON, and optional fields', async () => {
  const name = 'é'.repeat(65_536)
  const tree = {
    revision: 3,
    unavailable: true,
    entries: [{ ...fileEntry('z'), name }, fileEntry('a'), fileEntry('m')],
  } satisfies FileTreeResponse
  const storage = runtime.storage('ordered-lists')
  await writeBucketProjection(
    storage,
    {
      ...projection,
      tree: {
        ...tree,
        entries: tree.entries.map((entry) => ({ ...entry, futureEntry: true })),
      },
      changes,
    },
    {
      bucketFor: (path) => (path === 'a' ? 0 : 63),
      corrupt(manifest) {
        if (manifest.tree) {
          manifest.tree.fields.futureTree = true
          manifest.tree.buckets[63].digest = '0'.repeat(64)
        }
      },
    },
  )
  await expect(runtime.inspect('ordered-lists')).resolves.toMatchObject({
    treeChunks: 0,
    changesChunks: 0,
    treeBucketChunks: 3,
    changesBucketChunks: 2,
    treeOrderChunks: 1,
    changesOrderChunks: 1,
  })
  await runtime.evict('ordered-lists')
  await expect(readStoredFiles(storage)).resolves.toStrictEqual({
    ...projection,
    tree,
  })
})

it('reads empty lists and distinguishes them from absent lists', async () => {
  const empty: StoredFiles = {
    ...projection,
    tree: { revision: 3, entries: [] },
    changes: {
      baseBranch: 'main',
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    },
  }
  const absent = { ...projection, tree: null, changes: null }
  const emptyStorage = runtime.storage('empty-lists')
  const absentStorage = runtime.storage('absent-lists')
  await writeBucketProjection(emptyStorage, empty)
  await writeBucketProjection(absentStorage, absent)
  await expect(runtime.inspect('empty-lists')).resolves.toMatchObject({
    chunks: 0,
  })
  await expect(readStoredFiles(emptyStorage)).resolves.toStrictEqual(empty)
  await expect(readStoredFiles(absentStorage)).resolves.toStrictEqual(absent)
})

it('reads the last item across an order chunk boundary', async () => {
  const first = fileEntry('a')
  const last = fileEntry('z')
  const entries = Array.from({ length: 65_536 }, () => first)
  entries.push(last)
  const storage = runtime.storage('split-order')
  await writeBucketProjection(storage, {
    ...projection,
    tree: { revision: 3, entries },
    changes: null,
  })
  await expect(runtime.inspect('split-order')).resolves.toMatchObject({
    treeOrderChunks: 2,
  })
  const state = new FilesState(storage)
  await expect(
    state.tree().then((tree) => ({
      count: tree?.entries.length,
      beforeBoundary: tree?.entries.at(65_535),
      afterBoundary: tree?.entries.at(65_536),
    })),
  ).resolves.toStrictEqual({
    count: 65_537,
    beforeBoundary: first,
    afterBoundary: last,
  })
})

it.each(['old', 'bucket'] as const)(
  'reads only the requested list keys in the %s layout',
  async (layout) => {
    const storage = runtime.storage(`independent-${layout}`)
    let keys: string[]
    if (layout === 'old') {
      await writeOldProjection(storage, projection)
      keys = [`${FILES_KEY}:tree:0`, `${FILES_KEY}:changes:0`]
    } else {
      keys = Object.keys(await writeBucketProjection(storage, projection))
    }
    const reads: string[][] = []
    const state = new FilesState({
      ...storage,
      async get(key) {
        reads.push([key])
        const value = await storage.get(key)
        if (layout === 'old' && key === FILES_KEY && isRecord(value)) {
          const oldManifest = { ...value, hash: 'unknown' }
          Object.setPrototypeOf(oldManifest, { layout: 'buckets' })
          return oldManifest
        }
        return value
      },
      getMany(requested) {
        reads.push([...requested].sort())
        return storage.getMany(requested)
      },
    })
    await expect(state.tree()).resolves.toStrictEqual(projection.tree)
    expect(reads).toEqual([
      [FILES_KEY],
      keys.filter((key) => key.startsWith(`${FILES_KEY}:tree:`)).sort(),
    ])
    reads.length = 0
    await expect(state.changes()).resolves.toStrictEqual(projection.changes)
    expect(reads).toEqual([
      [FILES_KEY],
      keys.filter((key) => key.startsWith(`${FILES_KEY}:changes:`)).sort(),
    ])
  },
)
