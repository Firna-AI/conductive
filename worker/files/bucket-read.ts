import {
  BUCKET_SYMBOLS,
  bucketListChunkKeys,
  type BucketInfo,
  type BucketList,
  type ListKind,
} from './bucket-layout'
import { invalidFileResponse } from './errors'
import type { FilesStorage } from './storage'

const CHUNKS_PER_READ = 64

async function appendChunks(
  storage: FilesStorage,
  keys: readonly string[],
  chunks: string[],
): Promise<void> {
  const values = await storage.getMany(keys)
  for (const key of keys) {
    const chunk = values.get(key)
    if (typeof chunk !== 'string') throw invalidFileResponse()
    chunks.push(chunk)
  }
}

async function readChunks(
  storage: FilesStorage,
  keys: Iterable<string>,
): Promise<string[]> {
  const chunks: string[] = []
  let batch: string[] = []
  for (const key of keys) {
    batch.push(key)
    if (batch.length === CHUNKS_PER_READ) {
      await appendChunks(storage, batch, chunks)
      batch = []
    }
  }
  if (batch.length > 0) await appendChunks(storage, batch, chunks)
  return chunks
}

function parseBucket(text: string, info: BucketInfo): unknown[] {
  if (info.count === 0 && info.chunks === 0) return []
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
  const chunks = await readChunks(storage, bucketListChunkKeys(kind, list))
  const order = chunks.slice(0, list.orderChunks).join('')
  if (order.length !== list.count) throw invalidFileResponse()

  let chunkIndex = list.orderChunks
  const buckets = list.buckets.map((info) => {
    const end = chunkIndex + info.chunks
    const text = chunks.slice(chunkIndex, end).join('')
    chunkIndex = end
    return parseBucket(text, info)
  })
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
