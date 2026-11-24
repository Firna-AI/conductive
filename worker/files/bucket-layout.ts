import { isRecord } from '../http'
import { sha256Hex } from '../software-image/digest'
import { invalidFileResponse } from './errors'
import { natural } from './parsers'

/**
 * Both layouts use `files:state:v1` for the connection, snapshot flag, and old
 * chunk counts. The old manifest has four fields. The bucket manifest sets
 * both old counts to zero and records `layout: 'buckets'`, `hash: 'fnv1a32'`,
 * `bucketCount: 64`, and one descriptor per list. Null means the list is
 * absent. Each descriptor stores the total count, the order chunk count, and
 * 64 bucket descriptors. Its fields omit the list's `entries` or `files` key.
 *
 * The writer hashes each path with 32-bit FNV-1a over its UTF-8 bytes, then
 * takes the result modulo 64. Each bucket holds its items in list order as a
 * JSON array. Its descriptor stores the item and chunk counts and the SHA-256
 * digest of that JSON as lowercase hex. Empty buckets use the digest of `[]`
 * and store no chunks.
 *
 * The order text holds one `BUCKET_SYMBOLS` character per item. Both the
 * order text and the bucket JSON are split at 65,536 JavaScript characters.
 * Their keys are `files:state:v1:<kind>:order:<i>` and
 * `files:state:v1:<kind>:bucket:<b>:<i>`, with zero-based decimal indexes.
 * An empty list has no order or bucket chunks.
 *
 * The reader joins each set of string chunks and parses each bucket as a JSON
 * array. It matches the list count against the order length and the sum of
 * bucket counts. Each known order symbol takes the next item from its bucket
 * until it has used exactly that bucket's declared count. The reader checks
 * digest syntax and follows the order symbols for placement. The existing
 * list parsers validate the reconstructed fields and items. Damage gives
 * the same error as damage in the old layout.
 */
export const FILES_KEY = 'files:state:v1'
// A chunk stays below the SQLite Durable Object value limit after UTF-8 encoding.
export const CHUNK_CHARACTERS = 65_536
export const BUCKET_LAYOUT = 'buckets'
export const BUCKET_HASH = 'fnv1a32'
export const BUCKET_COUNT = 64
export const BUCKET_SYMBOLS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export type ListKind = 'tree' | 'changes'

export interface BucketInfo {
  count: number
  chunks: number
  digest: string
}

export interface BucketList {
  fields: Record<string, unknown>
  count: number
  orderChunks: number
  buckets: BucketInfo[]
}

export interface BucketManifest {
  connectionId: string | null
  hasSnapshot: boolean
  treeChunks: 0
  changesChunks: 0
  layout: typeof BUCKET_LAYOUT
  hash: typeof BUCKET_HASH
  bucketCount: typeof BUCKET_COUNT
  tree: BucketList | null
  changes: BucketList | null
}

const encoder = new TextEncoder()

export function bucketOf(path: string): number {
  let hash = 0x811c9dc5
  for (const byte of encoder.encode(path)) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0
  }
  return hash % BUCKET_COUNT
}

export function bucketDigest(text: string): Promise<string> {
  return sha256Hex(text)
}

export function orderKey(kind: ListKind, index: number): string {
  return `${FILES_KEY}:${kind}:order:${index}`
}

export function bucketKey(
  kind: ListKind,
  bucket: number,
  index: number,
): string {
  return `${FILES_KEY}:${kind}:bucket:${bucket}:${index}`
}

function parseBucketInfo(value: unknown): BucketInfo {
  if (
    !isRecord(value) ||
    !natural(value.count) ||
    !natural(value.chunks) ||
    typeof value.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.digest)
  ) {
    throw invalidFileResponse()
  }
  return { count: value.count, chunks: value.chunks, digest: value.digest }
}

function parseBucketList(value: unknown, kind: ListKind): BucketList | null {
  if (value === null) return null
  if (
    !isRecord(value) ||
    !isRecord(value.fields) ||
    Object.hasOwn(value.fields, kind === 'tree' ? 'entries' : 'files') ||
    !natural(value.count) ||
    !natural(value.orderChunks) ||
    !Array.isArray(value.buckets) ||
    value.buckets.length !== BUCKET_COUNT
  ) {
    throw invalidFileResponse()
  }
  const buckets = Array.from(value.buckets, parseBucketInfo)
  if (buckets.reduce((sum, bucket) => sum + bucket.count, 0) !== value.count)
    throw invalidFileResponse()
  return {
    fields: value.fields,
    count: value.count,
    orderChunks: value.orderChunks,
    buckets,
  }
}

export function parseBucketManifest(
  value: Record<string, unknown>,
): BucketManifest {
  if (
    value.layout !== BUCKET_LAYOUT ||
    value.hash !== BUCKET_HASH ||
    value.bucketCount !== BUCKET_COUNT ||
    value.treeChunks !== 0 ||
    value.changesChunks !== 0 ||
    (value.connectionId !== null && typeof value.connectionId !== 'string') ||
    typeof value.hasSnapshot !== 'boolean'
  ) {
    throw invalidFileResponse()
  }
  return {
    connectionId: value.connectionId,
    hasSnapshot: value.hasSnapshot,
    treeChunks: 0,
    changesChunks: 0,
    layout: BUCKET_LAYOUT,
    hash: BUCKET_HASH,
    bucketCount: BUCKET_COUNT,
    tree: parseBucketList(value.tree, 'tree'),
    changes: parseBucketList(value.changes, 'changes'),
  }
}

export function* bucketListChunkKeys(
  kind: ListKind,
  list: BucketList | null,
): Iterable<string> {
  if (list === null) return
  for (let index = 0; index < list.orderChunks; index++)
    yield orderKey(kind, index)
  for (const [bucket, { chunks }] of list.buckets.entries()) {
    for (let index = 0; index < chunks; index++)
      yield bucketKey(kind, bucket, index)
  }
}

export function bucketListKeys(
  kind: ListKind,
  list: BucketList | null,
): string[] {
  return [...bucketListChunkKeys(kind, list)]
}
