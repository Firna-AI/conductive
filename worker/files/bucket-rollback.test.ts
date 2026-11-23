import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import { FILES_KEY } from './bucket-layout'
import { RunnerFileReports } from './runner-reports'
import { FilesState } from './state'
import {
  loadFiles,
  markFilesMoved,
  type FilesStorage,
  type StoredFiles,
} from './storage'
import { fileEntry, writeBucketProjection } from './test-support/bucket-builder'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'

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

interface Conversion {
  name: string
  prepare?: (storage: FilesStorage) => Promise<void>
  initial?: Partial<StoredFiles>
  convert: (storage: FilesStorage) => Promise<unknown>
  expected: Partial<StoredFiles>
}

const conversions: Conversion[] = [
  {
    name: 'FilesState.beginConnection',
    convert: (storage) => new FilesState(storage).beginConnection('new-stream'),
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
    convert: (storage) =>
      new FilesState(storage).apply(stream, {
        type: 'files.snapshot',
        tree: nextTree,
      }),
    expected: { tree: nextTree, hasSnapshot: true },
  },
  {
    name: 'files.changed',
    convert: (storage) =>
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
    convert: (storage) =>
      new FilesState(storage).apply(stream, {
        type: 'changes.updated',
        changes: nextChanges,
      }),
    expected: { changes: nextChanges },
  },
  {
    name: 'files.unavailable',
    convert: (storage) =>
      new FilesState(storage).apply(stream, { type: 'files.unavailable' }),
    expected: { tree: { ...tree, unavailable: true } },
  },
  {
    name: 'markFilesMoved',
    convert: markFilesMoved,
    expected: { tree: { ...tree, unavailable: true }, changes: null },
  },
  {
    name: 'RunnerFileReports.beginStream',
    convert: (storage) =>
      new RunnerFileReports(storage).beginStream('new-runner-stream'),
    expected: { connectionId: 'new-runner-stream', hasSnapshot: false },
  },
  {
    name: 'RunnerFileReports.accept',
    prepare: (storage) => new RunnerFileReports(storage).beginStream(stream),
    convert: (storage) =>
      new RunnerFileReports(storage).accept({
        type: 'changes.updated',
        changes: { ...nextChanges, revision: 1, partNumber: 1, partCount: 1 },
      }),
    expected: { changes: nextChanges },
  },
]

it.each(conversions)(
  '$name converts the projection to the old layout in one write',
  async ({ name, prepare, initial, convert, expected }) => {
    const storage = runtime.storage(name)
    await prepare?.(storage)
    const previous = { ...projection, ...initial }
    const original = await writeBucketProjection(storage, previous)
    const write = vi.fn(storage.write)
    await convert({ ...storage, write })

    const result = { ...previous, ...expected }
    const legacyManifest = {
      connectionId: result.connectionId,
      hasSnapshot: result.hasSnapshot,
      treeChunks: 1,
      changesChunks: result.changes === null ? 0 : 1,
    }
    const projectionWrites = write.mock.calls.filter(([updates, removals]) =>
      [...Object.keys(updates), ...removals].some(
        (key) => key === FILES_KEY || key.startsWith(`${FILES_KEY}:`),
      ),
    )
    expect(projectionWrites).toHaveLength(1)
    const [[updates, removals]] = projectionWrites
    expect(updates[FILES_KEY]).toStrictEqual(legacyManifest)
    expect([...removals].sort()).toStrictEqual(
      Object.keys(original)
        .filter((key) => key !== FILES_KEY)
        .sort(),
    )
    await expect(runtime.inspect(name)).resolves.toMatchObject({
      treeChunks: legacyManifest.treeChunks,
      changesChunks: legacyManifest.changesChunks,
      treeBucketChunks: 0,
      changesBucketChunks: 0,
      treeOrderChunks: 0,
      changesOrderChunks: 0,
    })
    await runtime.evict(name)
    await expect(storage.get(FILES_KEY)).resolves.toStrictEqual(legacyManifest)
    await expect(loadFiles(storage)).resolves.toStrictEqual(result)
  },
)

it('keeps the bucket layout when a connection or snapshot is stale', async () => {
  const storage = runtime.storage('stale-snapshot')
  const stored = await writeBucketProjection(storage, projection)
  const write = vi.fn(storage.write)
  const state = new FilesState({ ...storage, write })
  await expect(
    state.apply('old-stream', { type: 'files.unavailable' }),
  ).resolves.toBe(false)
  await expect(
    state.apply(stream, {
      type: 'files.snapshot',
      tree: { revision: 3, entries: [] },
    }),
  ).resolves.toBe(false)
  expect(write).not.toHaveBeenCalled()
  await expect(storage.getMany(Object.keys(stored))).resolves.toStrictEqual(
    new Map(Object.entries(stored)),
  )
  await expect(loadFiles(storage)).resolves.toStrictEqual(projection)
})

it('rolls back the manifest and chunks when a conversion put fails', async () => {
  const name = 'conversion-rollback'
  const storage = runtime.storage(name)
  const stored = await writeBucketProjection(storage, projection)
  const before = await runtime.inspect(name)
  // Workerd allows SQLite rows up to 8 MiB plus serialization overhead.
  const oversized = 'x'.repeat(9 * 1024 * 1024)
  const write = vi.fn<FilesStorage['write']>((updates, removals) =>
    storage.write(
      { ...updates, [`${FILES_KEY}:test-oversized`]: oversized },
      removals,
    ),
  )
  await expect(
    new FilesState({ ...storage, write }).beginConnection('new-stream'),
  ).rejects.toThrow('Test storage write failed')
  expect(write).toHaveBeenCalledTimes(1)
  await runtime.evict(name)
  await expect(storage.getMany(Object.keys(stored))).resolves.toStrictEqual(
    new Map(Object.entries(stored)),
  )
  await expect(runtime.inspect(name)).resolves.toStrictEqual(before)
  await expect(loadFiles(storage)).resolves.toStrictEqual(projection)
})
