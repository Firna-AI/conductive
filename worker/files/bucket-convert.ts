import {
  BUCKET_COUNT,
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
import { emptyBucket, emptyBucketManifest } from './bucket-write'
import { invalidFileResponse } from './errors'
import { legacyListValues } from './legacy-list'
import { natural, parseChanges, parseTree } from './parsers'
import { chunkKeys, legacyChunkKeys, readStoredText } from './stored-chunks'
import type { FilesManifest, FilesReader, FilesTransaction } from './storage'

/** Hold only one unfinished chunk for this bucket or order text. */
class ChunkWriter {
  private readonly transaction: FilesTransaction
  private readonly keyAt: (index: number) => string
  private buffer = ''
  chunks = 0

  constructor(transaction: FilesTransaction, keyAt: (index: number) => string) {
    this.transaction = transaction
    this.keyAt = keyAt
  }

  async append(text: string): Promise<void> {
    let start = 0
    while (start < text.length) {
      const end = start + CHUNK_CHARACTERS - this.buffer.length
      this.buffer += text.slice(start, end)
      if (this.buffer.length === CHUNK_CHARACTERS) await this.flush()
      start = end
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    await this.transaction.put(this.keyAt(this.chunks), this.buffer)
    this.chunks++
    this.buffer = ''
  }
}

function itemPath(kind: ListKind, value: unknown): string {
  if (kind === 'tree')
    return parseTree({ revision: 0, entries: [value] }).entries[0].path
  return parseChanges({
    baseBranch: '',
    summary: { files: 0, added: 0, removed: 0 },
    files: [value],
  }).files[0].path
}

async function convertList(
  transaction: FilesTransaction,
  kind: ListKind,
  legacyChunks: number,
): Promise<BucketList> {
  const groups = Array.from({ length: BUCKET_COUNT }, (_, bucket) => ({
    count: 0,
    writer: new ChunkWriter(transaction, (index) =>
      bucketKey(kind, bucket, index),
    ),
  }))
  const order = new ChunkWriter(transaction, (index) => orderKey(kind, index))
  const scalars = new Map<string, unknown>()
  let count = 0
  for await (const part of legacyListValues(transaction, kind, legacyChunks)) {
    if (part.type === 'field') {
      scalars.set(part.key, part.value)
    } else {
      const bucket = bucketOf(itemPath(kind, part.value))
      const group = groups[bucket]
      await group.writer.append(
        `${group.count === 0 ? '[' : ','}${JSON.stringify(part.value)}`,
      )
      group.count++
      await order.append(BUCKET_SYMBOLS[bucket])
      count++
    }
  }
  const fields = Object.fromEntries(scalars)
  if (kind === 'tree') parseTree({ ...fields, entries: [] })
  else parseChanges({ ...fields, files: [] })

  await order.flush()
  const empty = await emptyBucket()
  const buckets: BucketInfo[] = []
  for (const [bucket, group] of groups.entries()) {
    if (group.count === 0) {
      buckets.push(empty)
      continue
    }
    await group.writer.append(']')
    await group.writer.flush()
    const chunks = group.writer.chunks
    const text = await readStoredText(
      transaction,
      chunkKeys(chunks, (index) => bucketKey(kind, bucket, index)),
    )
    buckets.push({
      count: group.count,
      chunks,
      digest: await bucketDigest(text),
    })
  }
  for (const key of legacyChunkKeys(kind, legacyChunks))
    await transaction.delete(key)
  return { fields, count, orderChunks: order.chunks, buckets }
}

export async function convertFilesProjection(
  transaction: FilesTransaction,
  previous: FilesManifest,
): Promise<BucketManifest> {
  if (previous.layout === BUCKET_LAYOUT) return previous
  const manifest = emptyBucketManifest(previous)
  for (const kind of ['tree', 'changes'] as const) {
    const chunks = previous[`${kind}Chunks`]
    if (chunks > 0)
      manifest[kind] = await convertList(transaction, kind, chunks)
  }
  return manifest
}

export async function readLegacyTreeRevision(
  storage: FilesReader,
  chunks: number,
): Promise<number> {
  for await (const part of legacyListValues(storage, 'tree', chunks)) {
    if (part.type === 'field' && part.key === 'revision') {
      if (!natural(part.value)) throw invalidFileResponse()
      return part.value
    }
  }
  throw invalidFileResponse()
}
