import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import { BUCKET_LAYOUT, FILES_KEY, bucketListKeys } from './bucket-layout'
import { RunnerFileReports } from './runner-reports'
import { FilesState } from './state'
import { markFilesMoved, readFilesManifest, type FilesStorage } from './storage'
import { fileEntry, writeBucketProjection } from './test-support/bucket-builder'
import { observeFilesStorage } from './test-support/observe-storage'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'
import {
  readStoredFiles,
  type StoredFiles,
} from './test-support/storage-record'

let runtime: FilesStorageHarness
beforeAll(async () => {
  runtime = await createFilesStorage()
})
afterAll(async () => {
  await runtime.dispose()
})

const stream = 'stream'
const tree = { revision: 4, entries: [fileEntry('a')] }
const changes = {
  baseBranch: 'main',
  files: [
    { path: 'a', change: 'modified', uncommitted: false, added: 2, removed: 1 },
  ],
  summary: { files: 1, added: 2, removed: 1 },
} satisfies ChangesResponse
const projection: StoredFiles = {
  connectionId: stream,
  hasSnapshot: true,
  tree,
  changes,
}
const nextTree = { revision: 5, entries: [fileEntry('b')] }
const nextChanges = {
  baseBranch: 'release',
  uncommittedFileCount: 1,
  files: [
    { path: 'b', change: 'added', uncommitted: true, added: 3, removed: 0 },
  ],
  summary: { files: 1, added: 3, removed: 0 },
} satisfies ChangesResponse

interface ProjectionWrite {
  name: string
  prepare?: (storage: FilesStorage) => Promise<void>
  initial?: Partial<StoredFiles>
  apply: (storage: FilesStorage) => Promise<unknown>
  metadataOnly?: boolean
  expected: Partial<StoredFiles>
}

const projectionWrites: ProjectionWrite[] = [
  {
    name: 'FilesState.beginConnection',
    apply: (storage) => new FilesState(storage).beginConnection('new-stream'),
    metadataOnly: true,
    expected: { connectionId: 'new-stream', hasSnapshot: false },
  },
  {
    name: 'files.snapshot',
    initial: {
      hasSnapshot: false,
      tree: {
        ...tree,
        entries: [{ ...fileEntry('a'), name: 'a'.repeat(65_536) }],
      },
    },
    apply: (storage) =>
      new FilesState(storage).apply(stream, {
        type: 'files.snapshot',
        tree: nextTree,
      }),
    expected: { tree: nextTree, hasSnapshot: true },
  },
  {
    name: 'files.changed',
    apply: (storage) =>
      new FilesState(storage).apply(stream, {
        type: 'files.changed',
        delta: {
          revision: 5,
          changes: [{ operation: 'upsert', entry: fileEntry('b') }],
        },
      }),
    expected: {
      tree: { revision: 5, entries: [fileEntry('a'), fileEntry('b')] },
    },
  },
  {
    name: 'changes.updated',
    apply: (storage) =>
      new FilesState(storage).apply(stream, {
        type: 'changes.updated',
        changes: nextChanges,
      }),
    expected: { changes: nextChanges },
  },
  {
    name: 'files.unavailable',
    apply: (storage) =>
      new FilesState(storage).apply(stream, { type: 'files.unavailable' }),
    metadataOnly: true,
    expected: { tree: { ...tree, unavailable: true } },
  },
  {
    name: 'markFilesMoved',
    apply: markFilesMoved,
    metadataOnly: true,
    expected: { tree: { ...tree, unavailable: true }, changes: null },
  },
  {
    name: 'RunnerFileReports.beginStream',
    apply: (storage) =>
      new RunnerFileReports(storage).beginStream('new-runner-stream'),
    metadataOnly: true,
    expected: { connectionId: 'new-runner-stream', hasSnapshot: false },
  },
  {
    name: 'RunnerFileReports.accept',
    prepare: (storage) => new RunnerFileReports(storage).beginStream(stream),
    apply: (storage) =>
      new RunnerFileReports(storage).accept({
        type: 'changes.updated',
        changes: { ...nextChanges, revision: 1, partNumber: 1, partCount: 1 },
      }),
    expected: { changes: { ...nextChanges, revision: 1 } },
  },
]

it.each(projectionWrites)(
  '$name writes the bucket projection in one transaction call',
  async ({ name, prepare, initial, apply, expected, metadataOnly }) => {
    const storage = runtime.storage(name)
    await prepare?.(storage)
    const previous = { ...projection, ...initial }
    const original = await writeBucketProjection(storage, previous)
    const transaction = vi.spyOn(storage, 'transaction')
    const observed = observeFilesStorage(storage)
    await apply(observed.storage)

    const result = { ...previous, ...expected }
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(observed.writes).toHaveLength(1)
    const [{ updates, removals }] = observed.writes
    const manifest = await readFilesManifest(storage)
    expect(updates[FILES_KEY]).toStrictEqual(manifest)
    expect(manifest).toMatchObject({
      connectionId: result.connectionId,
      hasSnapshot: result.hasSnapshot,
      layout: BUCKET_LAYOUT,
      treeChunks: 0,
      changesChunks: 0,
    })
    expect(
      observed.reads.flat().some((key) => key.startsWith(`${FILES_KEY}:`)),
    ).toBe(!metadataOnly)
    expect(
      Object.keys(updates).some((key) => key.startsWith(`${FILES_KEY}:`)),
    ).toBe(!metadataOnly)
    if (manifest.layout !== BUCKET_LAYOUT)
      throw new Error('Expected bucket layout')
    const retained = new Set([
      ...bucketListKeys('tree', manifest.tree),
      ...bucketListKeys('changes', manifest.changes),
    ])
    const obsolete = Object.keys(original)
      .filter((key) => key !== FILES_KEY && !retained.has(key))
      .sort()
    expect([...removals].sort()).toStrictEqual(obsolete)
    await expect(runtime.inspect(name)).resolves.toMatchObject({
      treeChunks: 0,
      changesChunks: 0,
      chunks: retained.size,
    })
    await runtime.evict(name)
    await expect(storage.get(FILES_KEY)).resolves.toStrictEqual(manifest)
    await expect(storage.getMany(obsolete)).resolves.toStrictEqual(new Map())
    await expect(readStoredFiles(storage)).resolves.toStrictEqual(result)
  },
)

it('keeps the bucket layout when a connection or snapshot is stale', async () => {
  const storage = runtime.storage('stale-snapshot')
  const stored = await writeBucketProjection(storage, projection)
  const observed = observeFilesStorage(storage)
  const state = new FilesState(observed.storage)
  await expect(
    state.apply('old-stream', { type: 'files.unavailable' }),
  ).resolves.toBe(false)
  await expect(
    state.apply(stream, {
      type: 'files.snapshot',
      tree: { revision: 3, entries: [] },
    }),
  ).resolves.toBe(false)
  expect(observed.writes).toEqual([])
  await expect(storage.getMany(Object.keys(stored))).resolves.toStrictEqual(
    new Map(Object.entries(stored)),
  )
  await expect(readStoredFiles(storage)).resolves.toStrictEqual(projection)
})
