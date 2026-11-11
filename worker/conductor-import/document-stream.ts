import {
  ImportStorageError,
  type SealedImportPart,
} from '../../src/shared/conductor-import-storage'

/** A zero-sized queue starts no read until the consumer requests bytes. */
export function documentStream(
  parts: Iterable<SealedImportPart>,
  read: (
    part: SealedImportPart,
    signal: AbortSignal,
  ) => Promise<Uint8Array<ArrayBuffer>>,
): ReadableStream<Uint8Array> {
  const iterator = parts[Symbol.iterator]()
  const abort = new AbortController()
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          while (!abort.signal.aborted) {
            const next = iterator.next()
            if (next.done) {
              controller.close()
              return
            }
            if (next.value.part.group !== 'document')
              throw new ImportStorageError('invalid_part')
            const bytes = await read(next.value, abort.signal)
            if (abort.signal.aborted) return
            if (bytes.byteLength) {
              controller.enqueue(bytes)
              return
            }
          }
        } catch (error) {
          if (!abort.signal.aborted) controller.error(error)
          iterator.return?.()
        }
      },
      cancel() {
        abort.abort()
        iterator.return?.()
      },
    },
    { highWaterMark: 0 },
  )
}
