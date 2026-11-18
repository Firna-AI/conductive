const encoder = new TextEncoder()
const replacement = encoder.encode('[redacted]')

/** Keep only a possible split credential. Other error bytes retain their encoding. */
export function redactErrorBody(
  source: ReadableStream<Uint8Array>,
  ...secrets: string[]
): ReadableStream<Uint8Array> {
  const patterns = [
    ...new Set(
      secrets.flatMap((secret) => [
        secret,
        JSON.stringify(secret).slice(1, -1),
      ]),
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((value) => encoder.encode(value))
  if (!patterns.length) return source
  const longest = Math.max(...patterns.map((value) => value.length))
  let pending = new Uint8Array(0)
  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const bytes = new Uint8Array(pending.length + chunk.length)
        bytes.set(pending)
        bytes.set(chunk, pending.length)
        pending = emit(
          bytes,
          Math.max(0, bytes.length - longest + 1),
          controller,
        )
      },
      flush(controller) {
        emit(pending, pending.length, controller)
      },
    }),
  )

  function emit(
    bytes: Uint8Array,
    end: number,
    controller: TransformStreamDefaultController<Uint8Array>,
  ) {
    let start = 0
    let position = 0
    while (position < end) {
      const match = patterns.find(
        (pattern) =>
          position + pattern.length <= bytes.length &&
          pattern.every((value, index) => value === bytes[position + index]),
      )
      if (!match) {
        position++
        continue
      }
      if (position > start) controller.enqueue(bytes.subarray(start, position))
      controller.enqueue(replacement)
      position += match.length
      start = position
    }
    if (position > start) controller.enqueue(bytes.subarray(start, position))
    return bytes.slice(position)
  }
}
