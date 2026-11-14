/** Preserve the entry's counted source while giving native R2 a known stream length. */
export function fixedUploadBody(request: Request, sizeBytes: number) {
  const fixed = new FixedLengthStream(sizeBytes)
  const controller = new AbortController()
  let failed = false
  let received = 0
  let lastByte: Uint8Array | undefined
  const observed = new TransformStream<Uint8Array, Uint8Array>({
    transform(bytes, stream) {
      received += bytes.byteLength
      if (received > sizeBytes)
        throw new Error('The attachment byte count did not match.')
      if (!bytes.byteLength) return
      if (lastByte) stream.enqueue(lastByte)
      stream.enqueue(bytes.subarray(0, bytes.byteLength - 1))
      lastByte = bytes.slice(-1)
    },
    flush(stream) {
      if (received !== sizeBytes)
        throw new Error('The attachment byte count did not match.')
      // Native R2 must not receive the final byte before the counted source ends.
      if (lastByte) stream.enqueue(lastByte)
    },
  })
  const empty = () =>
    new ReadableStream<Uint8Array>({
      start(stream) {
        stream.close()
      },
    })
  const finished = (request.body ?? empty())
    .pipeThrough(observed, { signal: controller.signal })
    .pipeTo(fixed.writable, {
      signal: controller.signal,
    })
  void finished.catch(() => {
    failed = true
  })
  return {
    body: fixed.readable,
    finished,
    failed: () => failed || received !== sizeBytes,
    cancel: async (reason: unknown) => {
      controller.abort(reason)
      await finished.catch(() => undefined)
      await fixed.readable.cancel(reason).catch(() => undefined)
    },
  }
}
