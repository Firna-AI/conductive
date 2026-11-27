import { HttpError } from '../http'
import {
  BUCKET_COUNT,
  BUCKET_HASH,
  BUCKET_LAYOUT,
  BUCKET_SYMBOLS,
  CHUNK_CHARACTERS,
  bucketDigest,
  bucketKey,
  bucketOf,
  orderKey,
  type BucketInfo,
  type BucketList,
  type BucketManifest,
  type ListKind,
} from './bucket-layout'
import { invalidFileResponse } from './errors'
import {
  chunkKeys,
  deleteStoredChunks,
  readStoredText,
  warnDiscardedChunks,
} from './stored-chunks'
import type { FilesReader, FilesTransaction } from './storage'

export function emptyBucketManifest({
  connectionId,
  hasSnapshot,
}: Pick<BucketManifest, 'connectionId' | 'hasSnapshot'>): BucketManifest {
  return {
    connectionId,
    hasSnapshot,
    treeChunks: 0,
    changesChunks: 0,
    layout: BUCKET_LAYOUT,
    hash: BUCKET_HASH,
    bucketCount: BUCKET_COUNT,
    tree: null,
    changes: null,
  }
}

interface BucketListChunks {
  orderChunks: number
  buckets: readonly Pick<BucketInfo, 'chunks'>[]
}

export async function deleteBucketList(
  transaction: FilesTransaction,
  kind: ListKind,
  list: BucketListChunks | null,
): Promise<void> {
  if (!list) return
  await deleteStoredChunks(
    transaction,
    chunkKeys(list.orderChunks, (index) => orderKey(kind, index)),
  )
  for (const [bucket, { chunks }] of list.buckets.entries()) {
    if (chunks === 0) continue
    await deleteStoredChunks(
      transaction,
      chunkKeys(chunks, (index) => bucketKey(kind, bucket, index)),
    )
  }
}

async function writeText(
  transaction: FilesTransaction,
  keyAt: (index: number) => string,
  text: string,
  previousChunks: number,
  previousTextUnreadable = false,
): Promise<number> {
  const chunks = Math.ceil(text.length / CHUNK_CHARACTERS)
  for (let index = 0; index < chunks; index++) {
    const start = index * CHUNK_CHARACTERS
    await transaction.put(
      keyAt(index),
      text.slice(start, start + CHUNK_CHARACTERS),
    )
  }
  const deletedAll = await deleteStoredChunks(
    transaction,
    chunkKeys(previousChunks, keyAt, chunks),
  )
  if (deletedAll && previousTextUnreadable) warnDiscardedChunks()
  return chunks
}

export async function emptyBucket(): Promise<BucketInfo> {
  return { count: 0, chunks: 0, digest: await bucketDigest('[]') }
}

export async function writeBucket(
  transaction: FilesTransaction,
  kind: ListKind,
  bucket: number,
  items: readonly { path: string }[],
  previous: BucketInfo | undefined,
): Promise<BucketInfo> {
  const text = JSON.stringify(items)
  const info = {
    count: items.length,
    chunks: items.length === 0 ? 0 : Math.ceil(text.length / CHUNK_CHARACTERS),
    digest: await bucketDigest(text),
  }
  if (
    info.digest !== previous?.digest ||
    info.chunks !== previous.chunks ||
    info.count !== previous.count
  ) {
    await writeText(
      transaction,
      (index) => bucketKey(kind, bucket, index),
      items.length === 0 ? '' : text,
      previous?.chunks ?? 0,
    )
  }
  return info
}

export async function readOrderText(
  storage: FilesReader,
  kind: ListKind,
  list: BucketList,
): Promise<string> {
  const text = await readStoredText(
    storage,
    chunkKeys(list.orderChunks, (index) => orderKey(kind, index)),
  )
  if (text.length !== list.count) throw invalidFileResponse()
  return text
}

export function writeOrder(
  transaction: FilesTransaction,
  kind: ListKind,
  order: string,
  previousOrder: string | null,
  previousChunks: number,
): Promise<number> {
  if (
    order === previousOrder &&
    previousChunks === Math.ceil(order.length / CHUNK_CHARACTERS)
  )
    return Promise.resolve(previousChunks)
  return writeText(
    transaction,
    (index) => orderKey(kind, index),
    order,
    previousChunks,
    previousOrder === null,
  )
}

export async function writeBucketList(
  transaction: FilesTransaction,
  kind: ListKind,
  fields: BucketList['fields'],
  items: readonly { path: string }[],
  previous: BucketList | null,
): Promise<BucketList> {
  const groups = Array.from(
    { length: BUCKET_COUNT },
    (): { path: string }[] => [],
  )
  let order = ''
  for (const item of items) {
    const bucket = bucketOf(item.path)
    groups[bucket].push(item)
    order += BUCKET_SYMBOLS[bucket]
  }

  const empty = await emptyBucket()
  const buckets: BucketInfo[] = []
  for (const [bucket, group] of groups.entries()) {
    const earlier = previous?.buckets[bucket]
    buckets.push(
      group.length || earlier?.chunks
        ? await writeBucket(transaction, kind, bucket, group, earlier)
        : empty,
    )
  }
  const previousOrder = previous
    ? await readOrderText(transaction, kind, previous).catch(
        (error: unknown) => {
          if (
            error instanceof HttpError &&
            error.status === 502 &&
            error.code === 'file_unavailable'
          )
            return null
          throw error
        },
      )
    : ''
  const orderChunks = await writeOrder(
    transaction,
    kind,
    order,
    previousOrder,
    previous?.orderChunks ?? 0,
  )
  return { fields, count: items.length, orderChunks, buckets }
}
