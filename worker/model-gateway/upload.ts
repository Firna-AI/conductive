import type { CodexBodyScanner } from './codex-body'

/** One reader forwards bytes, then drains an early reply's remaining upload. */
export function gatewayUpload(
  source: ReadableStream<Uint8Array> | null,
  failed: (reason: unknown) => void,
  scanner?: CodexBodyScanner,
) {
  if (!source)
    return {
      body: null,
      finish: async () => undefined,
      cancel: () => undefined,
    }

  const reader = source.getReader()
  let forwarding!: ReadableStreamDefaultController<Uint8Array>
  let forwardingEnded = false
  let finished = false
  let draining = false
  let failure: { reason: unknown } | undefined
  let pulling: Promise<void> | undefined
  let held: Uint8Array | undefined
  const throwIfFailed = () => {
    if (failure) throw failure.reason
  }
  const closeForwarding = () => {
    if (forwardingEnded) return
    forwardingEnded = true
    forwarding.close()
  }
  const cancel = (reason?: unknown) => {
    if (finished) return
    failure ??= { reason }
    finished = true
    if (!forwardingEnded) {
      forwardingEnded = true
      forwarding.error(reason)
    }
    void reader
      .cancel(reason)
      .catch(() => undefined)
      .then(() => reader.releaseLock())
  }
  const body = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        forwarding = controller
      },
      pull() {
        if (draining || finished) {
          closeForwarding()
          return
        }
        pulling = (async () => {
          try {
            while (!finished) {
              const value = await reader.read()
              if (finished) return
              if (value.done) {
                scanner?.finish()
                if (held && !draining) forwarding.enqueue(held)
                held = undefined
                finished = true
                reader.releaseLock()
                closeForwarding()
                return
              }
              scanner?.write(value.value)
              if (draining) {
                closeForwarding()
                return
              }
              if (!scanner) {
                forwarding.enqueue(value.value)
                return
              }
              if (value.value.byteLength > 0) {
                // A truncated body must retain its last byte until valid EOF.
                const forwarded =
                  held !== undefined || value.value.byteLength > 1
                if (held) forwarding.enqueue(held)
                if (value.value.byteLength > 1)
                  forwarding.enqueue(value.value.subarray(0, -1))
                held = Uint8Array.of(value.value[value.value.byteLength - 1])
                if (forwarded) return
              }
            }
          } catch (reason) {
            failure = { reason }
            cancel(reason)
            failed(reason)
          }
        })()
        return pulling
      },
      cancel() {
        forwardingEnded = true
        draining = true
      },
    },
    { highWaterMark: 0 },
  )
  return {
    body,
    cancel,
    async finish() {
      draining = true
      await pulling
      closeForwarding()
      throwIfFailed()
      try {
        while (!finished) {
          const value = await reader.read()
          if (finished) break
          if (value.done) {
            scanner?.finish()
            held = undefined
            finished = true
            reader.releaseLock()
          } else scanner?.write(value.value)
        }
      } catch (reason) {
        cancel(reason)
        failed(reason)
        throw reason
      }
      throwIfFailed()
    },
  }
}
