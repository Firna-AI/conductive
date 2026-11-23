import {
  BUCKET_SYMBOLS,
  bucketKey,
  bucketListKeys,
  orderKey,
  type BucketInfo,
  type BucketList,
  type ListKind,
} from './bucket-layout'
import { invalidFileResponse } from './errors'
import type { FilesStorage } from './storage'

function joinChunks(
  values: ReadonlyMap<string, unknown>,
  count: number,
  keyAt: (index: number) => string,
): string {
  const chunks: string[] = []
  for (let index = 0; index < count; index++) {
    const chunk = values.get(keyAt(index))
    if (typeof chunk !== 'string') throw invalidFileResponse()
    chunks.push(chunk)
  }
  return chunks.join('')
}

function readBucket(
  values: ReadonlyMap<string, unknown>,
  kind: ListKind,
  bucket: number,
  info: BucketInfo,
): unknown[] {
  if (info.count === 0 && info.chunks === 0) return []
  const text = joinChunks(values, info.chunks, (index) =>
    bucketKey(kind, bucket, index),
  )
  let items: unknown
  try {
    items = JSON.parse(text)
  } catch {
    throw invalidFileResponse()
  }
  if (!Array.isArray(items) || items.length !== info.count)
    throw invalidFileResponse()
  return items
}

export async function readBucketList(
  storage: FilesStorage,
  kind: ListKind,
  list: BucketList,
): Promise<unknown> {
  const values = await storage.getMany(bucketListKeys(kind, list))
  const order = joinChunks(values, list.orderChunks, (index) =>
    orderKey(kind, index),
  )
  if (order.length !== list.count) throw invalidFileResponse()

  const buckets = list.buckets.map((info, bucket) =>
    readBucket(values, kind, bucket, info),
  )
  const offsets = buckets.map(() => 0)
  const items: unknown[] = []
  for (const symbol of order) {
    const bucket = BUCKET_SYMBOLS.indexOf(symbol)
    if (bucket < 0 || offsets[bucket] >= buckets[bucket].length)
      throw invalidFileResponse()
    items.push(buckets[bucket][offsets[bucket]])
    offsets[bucket]++
  }
  if (buckets.some((items, bucket) => items.length !== offsets[bucket]))
    throw invalidFileResponse()
  return { ...list.fields, [kind === 'tree' ? 'entries' : 'files']: items }
}
