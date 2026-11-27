import {
  BUCKET_SYMBOLS,
  bucketDigest,
  bucketKey,
  bucketListChunkKeys,
  type BucketInfo,
  type BucketList,
  type ListKind,
} from './bucket-layout'
import { invalidFileResponse } from './errors'
import type { FilesReader } from './storage'
import { chunkKeys, readStoredText } from './stored-chunks'

const CHUNKS_PER_READ = 64

async function appendChunks(
  storage: FilesReader,
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
  storage: FilesReader,
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

async function parseBucket(
  text: string,
  info: BucketInfo,
  kind: ListKind,
): Promise<unknown[]> {
  if (info.count === 0 && info.chunks === 0) return []
  let items: unknown
  try {
    items = JSON.parse(text)
  } catch {
    throw invalidFileResponse()
  }
  if (!Array.isArray(items) || items.length !== info.count)
    throw invalidFileResponse()
  if (kind === 'changes' && (await bucketDigest(text)) !== info.digest)
    throw invalidFileResponse()
  return items
}

export async function readBucket(
  storage: FilesReader,
  kind: ListKind,
  bucket: number,
  info: BucketInfo,
): Promise<unknown[]> {
  const text = await readStoredText(
    storage,
    chunkKeys(info.chunks, (index) => bucketKey(kind, bucket, index)),
  )
  return parseBucket(text, info, kind)
}

export async function readBucketList(
  storage: FilesReader,
  kind: ListKind,
  list: BucketList,
): Promise<unknown> {
  const chunks = await readChunks(storage, bucketListChunkKeys(kind, list))
  const order = chunks.slice(0, list.orderChunks).join('')
  if (order.length !== list.count) throw invalidFileResponse()

  let chunkIndex = list.orderChunks
  const buckets = await Promise.all(
    list.buckets.map((info) => {
      const end = chunkIndex + info.chunks
      const text = chunks.slice(chunkIndex, end).join('')
      chunkIndex = end
      return parseBucket(text, info, kind)
    }),
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
