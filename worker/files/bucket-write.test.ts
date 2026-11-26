import { afterAll, beforeAll, expect, it } from 'vitest'

import type { BranchChangedFile } from '../../src/shared/generated/BranchChangedFile'
import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import {
  BUCKET_LAYOUT,
  CHUNK_CHARACTERS,
  FILES_KEY,
  bucketDigest,
  bucketKey,
  bucketListKeys,
  bucketOf,
  orderKey,
} from './bucket-layout'
import { readBucketList } from './bucket-read'
import { FilesState } from './state'
import { readFilesManifest } from './storage'
import { fileEntry, writeBucketProjection } from './test-support/bucket-builder'
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

const modified = (path: string): BranchChangedFile => ({
  path,
  change: 'modified',
  added: 1,
  removed: 0,
  uncommitted: true,
})
const previousChanges: ChangesResponse = {
  baseBranch: 'main',
  displayBaseBranch: 'masked-main',
  unpushedCommits: 2,
  files: [modified('z'), modified('a')],
  summary: { files: 2, added: 2, removed: 0 },
}

it('writes only the affected changes bucket, order and manifest when one file is added', async () => {
  const storage = runtime.storage('changes-add')
  const tree = { revision: 3, entries: [fileEntry('tree-only')] }
  await writeBucketProjection(storage, {
    connectionId: 'stream',
    hasSnapshot: true,
    tree,
    changes: previousChanges,
  })
  const observed = observeFilesStorage(storage)
  const state = new FilesState(observed.storage)
  const changes = {
    ...previousChanges,
    files: [...previousChanges.files, modified('!')],
    summary: { files: 3, added: 3, removed: 0 },
  }
  await expect(
    state.apply('stream', { type: 'changes.updated', changes }),
  ).resolves.toBe(true)
  const order = orderKey('changes', 0)
  expect(observed.reads).toEqual([[FILES_KEY], [order]])
  expect(observed.writes).toHaveLength(1)
  expect(Object.keys(observed.writes[0].updates).sort()).toEqual(
    [FILES_KEY, order, bucketKey('changes', bucketOf('!'), 0)].sort(),
  )
  expect(observed.writes[0].removals).toEqual([])
  await expect(state.changes()).resolves.toStrictEqual(changes)
  await expect(state.tree()).resolves.toStrictEqual(tree)
})

it('reads the tree and changes written to buckets after eviction', async () => {
  const name = 'bucket-round-trip'
  const storage = runtime.storage(name)
  const state = new FilesState(storage)
  const tree = {
    revision: 3,
    unavailable: true,
    entries: [
      { ...fileEntry('z'), name: '"\\😀'.repeat(CHUNK_CHARACTERS) },
      fileEntry('a'),
      fileEntry('!'),
    ],
  }
  const changes = { ...previousChanges, uncommittedFileCount: 7 }
  await state.beginConnection('stream')
  await state.apply('stream', { type: 'files.snapshot', tree })
  await state.apply('stream', { type: 'changes.updated', changes })
  await runtime.evict(name)

  const manifest = await readFilesManifest(storage)
  expect(manifest).toMatchObject({
    layout: 'buckets',
    hash: 'fnv1a32',
    bucketCount: 64,
    treeChunks: 0,
    changesChunks: 0,
  })
  if (
    manifest.layout !== BUCKET_LAYOUT ||
    !manifest.tree ||
    !manifest.changes
  ) {
    throw new Error('Expected both lists in the bucket manifest')
  }
  await expect(
    readBucketList(storage, 'tree', manifest.tree),
  ).resolves.toStrictEqual(tree)
  await expect(
    readBucketList(storage, 'changes', manifest.changes),
  ).resolves.toStrictEqual(changes)
  const keys = [
    ...bucketListKeys('tree', manifest.tree),
    ...bucketListKeys('changes', manifest.changes),
  ]
  const chunks = await storage.getMany(keys)
  expect(chunks.size).toBe(keys.length)
  for (const [key, chunk] of chunks) {
    expect(typeof chunk, key).toBe('string')
    expect(String(chunk).length, key).toBeGreaterThan(0)
    expect(String(chunk).length, key).toBeLessThanOrEqual(CHUNK_CHARACTERS)
  }
  const largeBucket = bucketOf('z')
  const info = manifest.tree.buckets[largeBucket]
  expect(info).toEqual({
    count: 1,
    chunks: 7,
    digest: await bucketDigest(JSON.stringify([tree.entries[0]])),
  })
  const emptyDigest = await bucketDigest('[]')
  expect(manifest.tree.buckets.filter(({ count }) => count === 0)).toEqual(
    Array.from({ length: 62 }, () => ({
      count: 0,
      chunks: 0,
      digest: emptyDigest,
    })),
  )

  const previous = await readStoredFiles(storage)
  expect(previous).toStrictEqual({
    connectionId: 'stream',
    hasSnapshot: true,
    tree,
    changes,
  })
})
