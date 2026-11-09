import type { GatewayRequestLifetime } from './request-lifetime'

export function gatewayStream(
  body: ReadableStream<Uint8Array>,
  lifetime: GatewayRequestLifetime,
) {
  const reader = body.getReader()
  let active = true
  let output!: ReadableStreamDefaultController<Uint8Array>
  const cleanup = () => {
    active = false
    lifetime.signal.removeEventListener('abort', disconnected)
    lifetime.complete()
  }
  const cancel = (reason: unknown) => {
    if (!active) return
    active = false
    output.error(reason)
    lifetime.cancel(reason)
    cleanup()
    void reader
      .cancel(reason)
      .catch(() => undefined)
      .then(() => reader.releaseLock())
  }
  const disconnected = () => cancel(lifetime.signal.reason)
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        output = controller
        lifetime.signal.addEventListener('abort', disconnected, {
          once: true,
        })
        if (lifetime.signal.aborted) disconnected()
      },
      async pull(controller) {
        try {
          const value = await reader.read()
          if (!active) return
          if (value.done) {
            cleanup()
            reader.releaseLock()
            controller.close()
          } else controller.enqueue(value.value)
        } catch {
          cancel(new Error('The model answer ended before it finished.'))
        }
      },
      cancel() {
        cancel(new Error('The model request was cancelled.'))
      },
    },
    { highWaterMark: 0 },
  )
}
