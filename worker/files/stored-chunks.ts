import { FILES_KEY, type ListKind } from './bucket-layout'
import { warnWorker } from '../warnings'
import { invalidFileResponse } from './errors'
import type { FilesReader, FilesTransaction } from './storage'

const CHUNKS_PER_READ = 64

export function* chunkKeys(
  count: number,
  keyAt: (index: number) => string,
  start = 0,
) {
  for (let index = start; index < count; index++) yield keyAt(index)
}

export function legacyChunkKeys(kind: ListKind, count: number) {
  return chunkKeys(count, (index) => `${FILES_KEY}:${kind}:${index}`)
}

async function* readBatch(storage: FilesReader, keys: readonly string[]) {
  const values = await storage.getMany(keys)
  for (const key of keys) {
    const chunk = values.get(key)
    if (typeof chunk !== 'string') throw invalidFileResponse()
    yield chunk
  }
}

/**
 * Reads chunks in batches. `readBucketList` in `bucket-read.ts` has its own
 * batched chunk reader.
 */
export async function* readStoredChunks(
  storage: FilesReader,
  keys: Iterable<string>,
): AsyncGenerator<string> {
  let batch: string[] = []
  for (const key of keys) {
    batch.push(key)
    if (batch.length === CHUNKS_PER_READ) {
      yield* readBatch(storage, batch)
      batch = []
    }
  }
  if (batch.length > 0) yield* readBatch(storage, batch)
}

export async function deleteStoredChunks(
  transaction: FilesTransaction,
  keys: Iterable<string>,
): Promise<boolean> {
  for (const key of keys) {
    if (await transaction.delete(key)) continue
    warnDiscardedChunks()
    return false
  }
  return true
}

export function warnDiscardedChunks(): void {
  warnWorker({ kind: 'files_projection_chunks_discarded' })
}

export async function readStoredText(
  storage: FilesReader,
  keys: Iterable<string>,
): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of readStoredChunks(storage, keys)) chunks.push(chunk)
  return chunks.join('')
}
