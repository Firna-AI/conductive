import { FILES_KEY, type ListKind } from './bucket-layout'
import { invalidFileResponse } from './errors'
import type { FilesReader } from './storage'

const CHUNKS_PER_READ = 64

export function* chunkKeys(count: number, keyAt: (index: number) => string) {
  for (let index = 0; index < count; index++) yield keyAt(index)
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

export async function readStoredText(
  storage: FilesReader,
  keys: Iterable<string>,
): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of readStoredChunks(storage, keys)) chunks.push(chunk)
  return chunks.join('')
}
