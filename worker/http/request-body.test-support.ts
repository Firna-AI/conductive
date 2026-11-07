export function streamedBody(chunks: Uint8Array[], stalledCancel = false) {
  const observed = { pulled: 0, bytes: 0, cancelled: 0 }
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[observed.pulled]
        if (!chunk) {
          controller.close()
          return
        }
        observed.pulled++
        observed.bytes += chunk.byteLength
        controller.enqueue(chunk)
      },
      cancel() {
        observed.cancelled++
        if (stalledCancel) return new Promise<void>(() => undefined)
      },
    },
    { highWaterMark: 0 },
  )
  return { body, observed }
}

export function streamedRequest(
  url: string,
  body: ReadableStream<Uint8Array>,
  headers?: HeadersInit,
  method = 'POST',
): Request {
  const init = { method, body, headers, duplex: 'half' }
  return new Request(url, init)
}

export const oversizedError = {
  error: {
    code: 'body_too_large',
    message: 'The request is too large. Send less data.',
  },
}
