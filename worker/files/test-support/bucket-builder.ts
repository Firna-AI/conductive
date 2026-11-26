import type { FileEntry } from '../../../src/shared/generated/FileEntry'
import {
  BUCKET_COUNT,
  BUCKET_HASH,
  BUCKET_LAYOUT,
  BUCKET_SYMBOLS,
  CHUNK_CHARACTERS,
  FILES_KEY,
  bucketDigest,
  bucketKey,
  bucketOf,
  orderKey,
  type BucketInfo,
  type BucketList,
  type BucketManifest,
  type ListKind,
} from '../bucket-layout'
import type { FilesStorage } from '../storage'
import { writeStorageRecord, type StoredFiles } from './storage-record'

type BucketFor = (path: string) => number

interface BucketOptions {
  bucketFor?: BucketFor
  corrupt?: (manifest: BucketManifest, updates: Record<string, unknown>) => void
}

export function fileEntry(path: string): FileEntry {
  return { path, name: path, kind: 'file', change: null }
}

function addChunks(
  updates: Record<string, unknown>,
  text: string,
  keyAt: (index: number) => string,
): number {
  let index = 0
  for (let start = 0; start < text.length; start += CHUNK_CHARACTERS) {
    updates[keyAt(index)] = text.slice(start, start + CHUNK_CHARACTERS)
    index++
  }
  return index
}

async function buildList(
  updates: Record<string, unknown>,
  kind: ListKind,
  fields: Record<string, unknown>,
  items: readonly { path: string }[],
  bucketFor: BucketFor,
): Promise<BucketList> {
  const grouped = Array.from(
    { length: BUCKET_COUNT },
    (): { path: string }[] => [],
  )
  const order = items.map((item) => {
    const bucket = bucketFor(item.path)
    grouped[bucket].push(item)
    return BUCKET_SYMBOLS[bucket]
  })
  const orderChunks = addChunks(updates, order.join(''), (index) =>
    orderKey(kind, index),
  )
  const emptyDigest = await bucketDigest('[]')
  const buckets: BucketInfo[] = []
  for (const [bucket, items] of grouped.entries()) {
    if (items.length === 0) {
      buckets.push({ count: 0, chunks: 0, digest: emptyDigest })
    } else {
      const text = JSON.stringify(items)
      const chunks = addChunks(updates, text, (index) =>
        bucketKey(kind, bucket, index),
      )
      buckets.push({
        count: items.length,
        chunks,
        digest: await bucketDigest(text),
      })
    }
  }
  return { fields, count: items.length, orderChunks, buckets }
}

export async function buildBucketProjection(
  state: StoredFiles,
  { bucketFor = bucketOf, corrupt }: BucketOptions = {},
): Promise<Readonly<Record<string, unknown>>> {
  const updates: Record<string, unknown> = {}
  const { entries, ...treeFields } = state.tree ?? { entries: [] }
  const { files, ...changesFields } = state.changes ?? { files: [] }
  const manifest: BucketManifest = {
    connectionId: state.connectionId,
    hasSnapshot: state.hasSnapshot,
    treeChunks: 0,
    changesChunks: 0,
    layout: BUCKET_LAYOUT,
    hash: BUCKET_HASH,
    bucketCount: BUCKET_COUNT,
    tree:
      state.tree &&
      (await buildList(updates, 'tree', treeFields, entries, bucketFor)),
    changes:
      state.changes &&
      (await buildList(updates, 'changes', changesFields, files, bucketFor)),
  }
  updates[FILES_KEY] = manifest
  corrupt?.(manifest, updates)
  return updates
}

export async function writeBucketProjection(
  storage: FilesStorage,
  state: StoredFiles,
  options?: BucketOptions,
): Promise<Readonly<Record<string, unknown>>> {
  const updates = await buildBucketProjection(state, options)
  await writeStorageRecord(storage, updates)
  return updates
}

export async function writeOldProjection(
  storage: FilesStorage,
  state: StoredFiles,
): Promise<Readonly<Record<string, unknown>>> {
  const updates: Record<string, unknown> = {}
  const treeChunks = addChunks(
    updates,
    state.tree === null ? '' : JSON.stringify(state.tree),
    (index) => `files:state:v1:tree:${index}`,
  )
  const changesChunks = addChunks(
    updates,
    state.changes === null ? '' : JSON.stringify(state.changes),
    (index) => `files:state:v1:changes:${index}`,
  )
  updates['files:state:v1'] = {
    connectionId: state.connectionId,
    hasSnapshot: state.hasSnapshot,
    treeChunks,
    changesChunks,
  }
  await writeStorageRecord(storage, updates)
  return updates
}
