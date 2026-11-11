import {
  ImportStorageError,
  type ImportByteRange,
  type ImportPart,
} from '../../src/shared/conductor-import-storage'
import { sha256 } from './r2-signing'

function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) throw new ImportStorageError('read_cancelled')
}

/** Count actual bytes. Metadata alone never proves a complete part. */
export async function readR2Part(
  bucket: R2Bucket,
  key: string,
  part: ImportPart,
  range?: ImportByteRange,
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  checkCancellation(signal)
  const object = await bucket.get(key, range ? { range } : undefined)
  if (!object) throw new ImportStorageError('part_missing')
  if (signal?.aborted || object.size !== part.sizeBytes) {
    await object.body.cancel().catch(() => undefined)
    checkCancellation(signal)
    throw new ImportStorageError('part_mismatch')
  }
  const length = range?.length ?? part.sizeBytes
  const bytes = new Uint8Array(length)
  const reader = object.body.getReader()
  const cancel = () => {
    void reader.cancel().catch(() => undefined)
  }
  signal?.addEventListener('abort', cancel, { once: true })
  let offset = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      checkCancellation(signal)
      if (done) break
      if (value.byteLength > length - offset) {
        await reader.cancel().catch(() => undefined)
        throw new ImportStorageError('part_mismatch')
      }
      bytes.set(value, offset)
      offset += value.byteLength
    }
    if (offset !== length) throw new ImportStorageError('part_mismatch')
    if (!range && (await sha256(bytes)) !== part.sha256)
      throw new ImportStorageError('part_mismatch')
    checkCancellation(signal)
    return bytes
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    signal?.removeEventListener('abort', cancel)
    reader.releaseLock()
  }
}
