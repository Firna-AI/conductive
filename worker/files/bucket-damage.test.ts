import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import {
  FILES_KEY,
  bucketKey,
  orderKey,
  type BucketList,
  type BucketManifest,
} from './bucket-layout'
import { loadFiles, saveFiles, type StoredFiles } from './storage'
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

const projection: StoredFiles = {
  connectionId: 'stream',
  hasSnapshot: true,
  tree: { revision: 1, entries: [fileEntry('a')] },
  changes: {
    baseBranch: 'main',
    files: [],
    summary: { files: 0, added: 0, removed: 0 },
  },
}
const readError = { status: 502, code: 'file_unavailable' }
const treeBucket = bucketKey('tree', 0, 0)
const treeOrder = orderKey('tree', 0)

interface Fixture {
  manifest: BucketManifest
  tree: BucketList
  changes: BucketList
  updates: Record<string, unknown>
}

const damageCases: Record<string, (fixture: Fixture) => void> = {
  'unknown layout'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, layout: 'other' }
  },
  'unknown hash'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, hash: 'other' }
  },
  'wrong bucket count'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, bucketCount: 63 }
  },
  'old tree chunk count'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, treeChunks: 1 }
  },
  'old changes chunk count'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, changesChunks: 1 }
  },
  'short bucket array'({ tree }) {
    tree.buckets.pop()
  },
  'invalid connection ID'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, connectionId: 1 }
  },
  'invalid snapshot flag'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, hasSnapshot: 1 }
  },
  'missing list descriptor'({ manifest, updates }) {
    updates[FILES_KEY] = { ...manifest, tree: undefined }
  },
  'fields array'({ manifest, tree, updates }) {
    updates[FILES_KEY] = { ...manifest, tree: { ...tree, fields: [] } }
  },
  'entries in tree fields'({ tree }) {
    tree.fields.entries = []
  },
  'files in changes fields'({ changes }) {
    changes.fields.files = []
  },
  'negative list count'({ tree }) {
    tree.count = -1
  },
  'fractional order chunk count'({ tree }) {
    tree.orderChunks = 0.5
  },
  'negative bucket item count'({ tree }) {
    tree.buckets[0].count = -1
  },
  'unsafe bucket chunk count'({ tree }) {
    tree.buckets[0].chunks = Number.MAX_SAFE_INTEGER + 1
  },
  'uppercase digest'({ tree }) {
    tree.buckets[0].digest = 'A'.repeat(64)
  },
  'short digest'({ tree }) {
    tree.buckets[0].digest = 'a'.repeat(63)
  },
  'missing order chunk'({ updates }) {
    delete updates[treeOrder]
  },
  'non-string order chunk'({ updates }) {
    updates[treeOrder] = 1
  },
  'wrong order length'({ updates }) {
    updates[treeOrder] = 'AA'
  },
  'unknown order symbol'({ updates }) {
    updates[treeOrder] = '?'
  },
  'wrong per-bucket symbol count'({ updates }) {
    updates[treeOrder] = 'B'
  },
  'wrong sum of bucket item counts'({ tree, updates }) {
    tree.buckets[1] = { ...tree.buckets[0] }
    updates[bucketKey('tree', 1, 0)] = updates[treeBucket]
  },
  'missing bucket chunk'({ updates }) {
    delete updates[treeBucket]
  },
  'non-string bucket chunk'({ updates }) {
    updates[treeBucket] = []
  },
  'nonempty bucket without chunks'({ tree, updates }) {
    tree.buckets[0].chunks = 0
    delete updates[treeBucket]
  },
  'malformed bucket JSON'({ updates }) {
    updates[treeBucket] = '['
  },
  'non-array bucket JSON'({ updates }) {
    updates[treeBucket] = 'null'
  },
  'wrong bucket array length'({ updates }) {
    updates[treeBucket] = '[]'
  },
  'invalid file entry'({ updates }) {
    updates[treeBucket] = '[{}]'
  },
  'invalid changes fields'({ changes }) {
    changes.fields.baseBranch = 1
  },
}

it('rejects damaged bucket records with the old-layout read error', async () => {
  const oldStorage = runtime.storage('damaged-old')
  const oldManifest = {
    connectionId: null,
    hasSnapshot: false,
    treeChunks: 0,
    changesChunks: 0,
  }
  await oldStorage.write(
    { [FILES_KEY]: { ...oldManifest, treeChunks: -1 } },
    [],
  )
  await expect(loadFiles(oldStorage)).rejects.toMatchObject(readError)
  await oldStorage.write(
    {
      [FILES_KEY]: { ...oldManifest, treeChunks: 1 },
      [`${FILES_KEY}:tree:0`]: 'null',
    },
    [],
  )
  await expect(loadFiles(oldStorage)).rejects.toMatchObject(readError)

  // The harness transports values as JSON, which omits an undefined field.
  await expect(
    loadFiles({
      ...oldStorage,
      get: (key) =>
        key === FILES_KEY
          ? Promise.resolve({ ...oldManifest, layout: undefined })
          : oldStorage.get(key),
    }),
    'own undefined layout',
  ).rejects.toMatchObject(readError)

  await Promise.all(
    Object.entries(damageCases).map(async ([name, damage]) => {
      const storage = runtime.storage(name)
      await writeBucketProjection(storage, projection, {
        bucketFor: () => 0,
        corrupt(manifest, updates) {
          const { tree, changes } = manifest
          if (!tree || !changes) throw new Error('Expected both fixture lists')
          damage({ manifest, tree, changes, updates })
        },
      })
      await expect(loadFiles(storage), name).rejects.toMatchObject(readError)
    }),
  )
})

it('rejects a damaged bucket manifest before an old-layout write', async () => {
  const storage = runtime.storage('damaged-save')
  const original = await writeBucketProjection(storage, projection, {
    corrupt(manifest, updates) {
      updates[FILES_KEY] = { ...manifest, hash: 'other' }
    },
  })
  const write = vi.fn(storage.write)
  await expect(
    saveFiles({ ...storage, write }, projection),
  ).rejects.toMatchObject(readError)
  expect(write).not.toHaveBeenCalled()
  await expect(storage.get(FILES_KEY)).resolves.toStrictEqual(
    original[FILES_KEY],
  )
})
