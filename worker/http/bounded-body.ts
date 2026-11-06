export class BodyBudgetExceeded extends Error {
  constructor() {
    super('The body exceeded its byte budget.')
  }
}

/** Collect stream bytes up to the caller's budget and cancel on overflow. */
export async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  budget: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > budget) {
        await reader.cancel().catch(() => undefined)
        throw new BodyBudgetExceeded()
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes
  } finally {
    reader.releaseLock()
  }
}

/** Parse a complete UTF-8 JSON body after the bounded byte read succeeds. */
export async function readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  budget: number,
): Promise<unknown> {
  if (!body) throw new SyntaxError('Missing JSON body')
  const bytes = await readBoundedBody(body, budget)
  return JSON.parse(new TextDecoder().decode(bytes))
}
