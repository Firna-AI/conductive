import type { RedactionContext } from './redaction-context'
import type { RedactionPolicy } from './redaction-policy'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const replacement = encoder.encode('[redacted]')

class RedactionReader {
  private pending = new Uint8Array(0)
  private readonly policy: RedactionPolicy
  private readonly context: RedactionContext | null

  constructor(
    policy: RedactionPolicy,
    context: RedactionContext | null = policy.context(),
  ) {
    this.policy = policy
    this.context = context
  }

  write(
    chunk: Uint8Array,
    emit: (bytes: Uint8Array) => void,
    final = false,
  ): void {
    const bytes = new Uint8Array(this.pending.length + chunk.length)
    bytes.set(this.pending)
    bytes.set(chunk, this.pending.length)
    const end = final
      ? bytes.length
      : Math.max(0, bytes.length - this.policy.carryBytes)
    let start = 0
    let position = 0
    while (position < end) {
      const length = this.policy.match(bytes, position, this.context)
      if (!length) {
        this.context?.read(bytes, position)
        position++
        continue
      }
      if (position > start) emit(bytes.subarray(start, position))
      emit(replacement)
      for (let index = position; index < position + length; index++)
        this.context?.read(bytes, index)
      position += length
      start = position
    }
    if (position > start) emit(bytes.subarray(start, position))
    this.pending = bytes.slice(position)
  }
}

export function redactHeaderValue(
  name: string,
  value: string,
  policy: RedactionPolicy,
): string {
  const parts: string[] = []
  new RedactionReader(policy, policy.context({ name, value })).write(
    encoder.encode(value),
    (bytes) => parts.push(decoder.decode(bytes, { stream: true })),
    true,
  )
  parts.push(decoder.decode())
  return parts.join('')
}

/** Keep only a possible split credential and its JSON escape or token boundary. */
export function redactErrorBody(
  source: ReadableStream<Uint8Array>,
  policy: RedactionPolicy,
): ReadableStream<Uint8Array> {
  const reader = new RedactionReader(policy)
  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        reader.write(chunk, (bytes) => controller.enqueue(bytes))
      },
      flush(controller) {
        reader.write(
          new Uint8Array(0),
          (bytes) => controller.enqueue(bytes),
          true,
        )
      },
    }),
  )
}
