import { afterAll, beforeAll, expect, it } from 'vitest'

import type { FileEntry } from '../../src/shared/generated/FileEntry'
import {
  BUCKET_SYMBOLS,
  bucketKey,
  bucketOf,
  orderKey,
  type BucketManifest,
} from './bucket-layout'
import { FilesState } from './state'
import { fileEntry, writeBucketProjection } from './test-support/bucket-builder'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from './test-support/storage'
import type { StoredFiles } from './test-support/storage-record'

let runtime: FilesStorageHarness
beforeAll(async () => {
  runtime = await createFilesStorage()
})
afterAll(async () => {
  await runtime.dispose()
})

const storedEntry = fileEntry('a')
const newEntry = fileEntry('b')
const projection: StoredFiles = {
  connectionId: 'stream',
  hasSnapshot: true,
  tree: { revision: 1, entries: [storedEntry] },
  changes: {
    baseBranch: 'main',
    files: [],
    summary: { files: 0, added: 0, removed: 0 },
  },
}
const storedBucket = bucketKey('tree', bucketOf(storedEntry.path), 0)
const treeOrder = orderKey('tree', 0)

const damageCases: {
  name: string
  entry: FileEntry
  corrupt(manifest: BucketManifest, updates: Record<string, unknown>): void
}[] = [
  {
    name: 'order symbol for an empty bucket',
    entry: newEntry,
    corrupt(_manifest, updates) {
      updates[treeOrder] = BUCKET_SYMBOLS[bucketOf(newEntry.path)]
    },
  },
  {
    name: 'unknown order symbol',
    entry: newEntry,
    corrupt(_manifest, updates) {
      updates[treeOrder] = '?'
    },
  },
  {
    name: 'short order text',
    entry: newEntry,
    corrupt(_manifest, updates) {
      updates[treeOrder] = ''
    },
  },
  {
    name: 'wrong bucket array length',
    entry: storedEntry,
    corrupt(_manifest, updates) {
      updates[storedBucket] = '[]'
    },
  },
  {
    name: 'malformed bucket JSON',
    entry: storedEntry,
    corrupt(_manifest, updates) {
      updates[storedBucket] = '['
    },
  },
  {
    name: 'damaged tree revision',
    entry: newEntry,
    corrupt({ tree }) {
      if (!tree) throw new Error('Expected a fixture tree')
      tree.fields.revision = 'invalid'
    },
  },
]

it.each(damageCases)(
  'rejects a tree delta with $name and preserves stored keys',
  async ({ name, entry, corrupt }) => {
    const storage = runtime.storage(`delta-${name}`)
    const original = await writeBucketProjection(storage, projection, {
      corrupt,
    })

    await expect(
      new FilesState(storage).apply('stream', {
        type: 'files.changed',
        delta: { revision: 2, changes: [{ operation: 'upsert', entry }] },
      }),
    ).rejects.toMatchObject({ status: 502, code: 'file_unavailable' })
    const keys = new Set(Object.keys(original))
    keys.add(bucketKey('tree', bucketOf(entry.path), 0))
    await expect(storage.getMany([...keys])).resolves.toStrictEqual(
      new Map(Object.entries(original)),
    )
  },
)
