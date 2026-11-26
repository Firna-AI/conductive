import { afterEach, expect, it, vi } from 'vitest'

import {
  FILES_KEY,
  bucketKey,
  bucketOf,
  orderKey,
} from '../files/bucket-layout'
import { FilesState } from '../files/state'
import {
  markFilesMoved,
  readFilesManifest,
  type FilesStorage,
} from '../files/storage'
import {
  buildBucketProjection,
  fileEntry,
  writeBucketProjection,
  writeOldProjection,
} from '../files/test-support/bucket-builder'
import { observeFilesStorage } from '../files/test-support/observe-storage'
import {
  writeStorageRecord,
  type StoredFiles,
} from '../files/test-support/storage-record'
import { nativeChatStore } from './native-store.test-support'

const entry = fileEntry('a')
const projection = {
  connectionId: 'stream',
  hasSnapshot: true,
  tree: { revision: 1, entries: [entry] },
  changes: {
    baseBranch: 'main',
    files: [
      {
        path: 'a',
        change: 'modified',
        uncommitted: false,
        added: 2,
        removed: 1,
      },
    ],
    summary: { files: 1, added: 2, removed: 1 },
  },
} satisfies StoredFiles
const damagedCount = 10_000
const damageWarning = {
  kind: 'files_projection_chunks_discarded',
  message: 'A file projection write discarded damaged chunks.',
}

afterEach(() => vi.restoreAllMocks())

async function nativeProjection() {
  const { storage, store } = await nativeChatStore()
  return {
    change: <T>(work: (files: FilesStorage) => Promise<T>) =>
      store.change(
        'workspace',
        ({ files }) => work(files),
        () => undefined,
      ),
    read: () => storage.list({ prefix: FILES_KEY }),
  }
}

function changesChunk(key: string): boolean {
  return key.startsWith(`${FILES_KEY}:changes:`)
}

it.each([
  { layout: 'old', deletes: 2 },
  { layout: 'bucket', deletes: 3 },
])(
  'commits a move with bounded Changes cleanup in the $layout layout',
  async ({ layout, deletes }) => {
    const { change, read } = await nativeProjection()
    await change(async (files) => {
      if (layout === 'old') {
        await writeOldProjection(files, projection)
        const manifest = await readFilesManifest(files)
        await writeStorageRecord(files, {
          [FILES_KEY]: { ...manifest, changesChunks: damagedCount },
        })
      } else {
        await writeBucketProjection(files, projection, {
          corrupt({ changes }) {
            if (!changes) throw new Error('Expected fixture changes')
            changes.orderChunks = damagedCount
          },
        })
      }
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(
      change(async (files) => {
        const observed = observeFilesStorage(files)
        await markFilesMoved(observed.storage)
        return observed.writes
          .flatMap(({ removals }) => removals)
          .filter(changesChunk).length
      }),
    ).resolves.toBe(deletes)
    const moved = await buildBucketProjection({
      ...projection,
      tree: { ...projection.tree, unavailable: true },
      changes: null,
    })
    await expect(read()).resolves.toStrictEqual(new Map(Object.entries(moved)))
    expect(warn.mock.calls).toEqual([[damageWarning]])
  },
)

it.each(['old', 'bucket'] as const)(
  'moves a valid %s projection without reading Changes chunks',
  async (layout) => {
    const { change } = await nativeProjection()
    const seed = layout === 'old' ? writeOldProjection : writeBucketProjection
    await change((files) => seed(files, projection))

    const reads = await change(async (files) => {
      const observed = observeFilesStorage(files)
      await markFilesMoved(observed.storage)
      return observed.reads.flat().filter(changesChunk)
    })
    expect(reads).toEqual([])
  },
)

it.each([
  { damage: 'obsolete bucket chunk count', deletes: 2 },
  { damage: 'obsolete order chunk count', deletes: 2 },
  { damage: 'short order text', deletes: 0 },
] as const)(
  'commits a full report over a damaged $damage',
  async ({ damage, deletes }) => {
    const { change, read } = await nativeProjection()
    await change((files) =>
      writeBucketProjection(files, projection, {
        corrupt({ tree }, updates) {
          if (!tree) throw new Error('Expected a fixture tree')
          if (damage === 'obsolete bucket chunk count') {
            const bucket = bucketOf(entry.path)
            tree.buckets[bucket].chunks = damagedCount
            updates[bucketKey('tree', bucket, 1)] = 'obsolete chunk'
          } else if (damage === 'obsolete order chunk count') {
            tree.orderChunks = damagedCount
            updates[orderKey('tree', 1)] = 'obsolete chunk'
          } else {
            updates[orderKey('tree', 0)] = ''
          }
        },
      }),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const tree = {
      revision: 2,
      entries: [{ ...entry, change: 'modified' }],
    } satisfies NonNullable<StoredFiles['tree']>

    await expect(
      change(async (files) => {
        const observed = observeFilesStorage(files)
        await new FilesState(observed.storage).apply('stream', {
          type: 'files.snapshot',
          tree,
        })
        return observed.writes.flatMap(({ removals }) => removals).length
      }),
    ).resolves.toBe(deletes)
    const stored = await buildBucketProjection({ ...projection, tree })
    await expect(read()).resolves.toStrictEqual(new Map(Object.entries(stored)))
    expect(warn.mock.calls).toEqual([[damageWarning]])
  },
)
