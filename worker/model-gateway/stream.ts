import type { ConnectionScheduler } from '../security/connection-access'

export function gatewayStream(
  body: ReadableStream<Uint8Array>,
  options: {
    check: () => Promise<boolean>
    schedule: ConnectionScheduler
    abort: () => void
    cleanup: () => void
    signal: AbortSignal
  },
) {
  const reader = body.getReader()
  let active = true
  let stopCheck: (() => void) | undefined
  let output!: ReadableStreamDefaultController<Uint8Array>
  const cleanup = () => {
    active = false
    stopCheck?.()
    options.signal.removeEventListener('abort', disconnected)
    options.cleanup()
  }
  const cancel = (reason: unknown) => {
    if (!active) return
    cleanup()
    output.error(reason)
    options.abort()
    void reader
      .cancel(reason)
      .catch(() => undefined)
      .then(() => reader.releaseLock())
  }
  const disconnected = () =>
    cancel(new Error('The model request was cancelled.'))
  const check = async () => {
    try {
      if (!active) return
      if (!(await options.check())) {
        cancel(new Error('The model turn ended.'))
        return
      }
      if (active) stopCheck = options.schedule(check, 30_000)
    } catch {
      cancel(new Error('The model turn could not be checked.'))
    }
  }
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        output = controller
        options.signal.addEventListener('abort', disconnected, { once: true })
        if (options.signal.aborted) disconnected()
        else stopCheck = options.schedule(check, 30_000)
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
