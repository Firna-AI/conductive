/** One reader forwards bytes, then drains an early reply's remaining upload. */
export function gatewayUpload(
  source: ReadableStream<Uint8Array> | null,
  failed: (reason: unknown) => void,
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
            const value = await reader.read()
            if (finished) return
            if (value.done) {
              finished = true
              reader.releaseLock()
              closeForwarding()
            } else if (draining) closeForwarding()
            else forwarding.enqueue(value.value)
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
          if (value.done) {
            finished = true
            reader.releaseLock()
          }
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
