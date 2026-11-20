import { ResponseBudget, responseOverflow } from './budgets'
import { invalidResponse } from './errors'

export function connectFrame(value: unknown): Uint8Array<ArrayBuffer> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const frame = new Uint8Array(5 + bytes.byteLength)
  new DataView(frame.buffer).setUint32(1, bytes.byteLength)
  frame.set(bytes, 5)
  return frame
}

export async function* connectFrames(
  body: ReadableStream<Uint8Array> | null,
  budget: ResponseBudget,
): AsyncGenerator<{ terminal: boolean; value: unknown }> {
  if (!body) return invalidResponse()
  const reader = body.getReader()
  const header = new Uint8Array(5)
  let headerBytes = 0
  let payload = new Uint8Array(0)
  let payloadBytes = 0
  let terminal = false
  let ended = false
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      budget.add(chunk.value.byteLength)
      if (ended && chunk.value.byteLength) return invalidResponse()
      let offset = 0
      while (offset < chunk.value.byteLength) {
        if (headerBytes < 5) {
          const count = Math.min(
            5 - headerBytes,
            chunk.value.byteLength - offset,
          )
          header.set(chunk.value.subarray(offset, offset + count), headerBytes)
          headerBytes += count
          offset += count
          if (headerBytes < 5) continue
          if (header[0] !== 0 && header[0] !== 2) return invalidResponse()
          terminal = header[0] === 2
          const length = new DataView(header.buffer).getUint32(1)
          if (length > budget.limit - 5) return responseOverflow(budget.kind)
          payload = new Uint8Array(length)
          payloadBytes = 0
        }
        const count = Math.min(
          payload.byteLength - payloadBytes,
          chunk.value.byteLength - offset,
        )
        payload.set(chunk.value.subarray(offset, offset + count), payloadBytes)
        payloadBytes += count
        offset += count
        if (payloadBytes !== payload.byteLength) continue
        let value: unknown
        try {
          value = JSON.parse(new TextDecoder().decode(payload))
        } catch {
          return invalidResponse()
        }
        headerBytes = 0
        ended = terminal
        yield { terminal, value }
        if (ended && offset < chunk.value.byteLength) return invalidResponse()
      }
    }
    if (headerBytes || !ended) return invalidResponse()
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
