const BODY_BUDGET = 26 * 1024 * 1024

/** Bound raw webhook bytes and selected API JSON before decoding either body. */
export async function readGitHubBody(
  body: ReadableStream<Uint8Array> | null,
  oversized: () => Error,
): Promise<Uint8Array<ArrayBuffer>> {
  if (body === null) return new Uint8Array(0)
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > BODY_BUDGET) {
        void reader.cancel().catch(() => undefined)
        throw oversized()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
