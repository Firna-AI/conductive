import { ProviderError } from './errors'
import { linkWorkerError } from '../error-reporting/causes'

/** Forward chunks without a file-sized buffer and require the declared byte count. */
export function fileWriteBody(
  source: ReadableStream<Uint8Array>,
  sizeBytes: number,
) {
  const reader = source.getReader()
  let received = 0
  let finished = false
  let complete = false
  let failure: unknown
  async function cancel() {
    if (finished) return
    finished = true
    try {
      await reader.cancel()
    } finally {
      reader.releaseLock()
    }
  }
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            finished = true
            reader.releaseLock()
            if (received !== sizeBytes)
              throw new ProviderError('unavailable', 503)
            complete = true
            controller.close()
            return
          }
          received += value.byteLength
          if (received > sizeBytes) {
            await cancel().catch(() => undefined)
            throw new ProviderError('unavailable', 503)
          }
          controller.enqueue(value)
        } catch (error) {
          failure = error
          await cancel().catch(() => undefined)
          controller.error(
            linkWorkerError(new ProviderError('unavailable', 503), error),
          )
        }
      },
      cancel,
    },
    { highWaterMark: 0 },
  )
  return { body, complete: () => complete, cancel, failure: () => failure }
}
