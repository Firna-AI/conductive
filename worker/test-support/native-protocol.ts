import type {
  NativeInvocation,
  NativeResult,
  NativeValue,
} from './native-values'

export type NativePacket =
  | { type: 'call'; id: string; invocation: NativeInvocation }
  | { type: 'result'; id: string; result: NativeResult }
  | { type: 'done'; result: NativeResult }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nativeValue(value: unknown): value is NativeValue {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value))
    return true
  if (!record(value)) return false
  switch (value.type) {
    case 'undefined':
      return true
    case 'array':
    case 'set':
      return Array.isArray(value.value) && value.value.every(nativeValue)
    case 'object':
      return (
        record(value.value) && Object.values(value.value).every(nativeValue)
      )
    case 'map':
      return (
        Array.isArray(value.value) &&
        value.value.every(
          (entry) =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            entry.every(nativeValue),
        )
      )
    case 'bytes':
      return (
        Array.isArray(value.value) &&
        value.value.every((entry) => typeof entry === 'number')
      )
    case 'reference':
      return (
        (value.owner === 'node' || value.owner === 'worker') &&
        typeof value.id === 'string' &&
        Array.isArray(value.path) &&
        value.path.every((key) => typeof key === 'string')
      )
    default:
      return false
  }
}

function invocation(value: unknown): value is NativeInvocation {
  return (
    record(value) &&
    record(value.reference) &&
    value.reference.type === 'reference' &&
    nativeValue(value.reference) &&
    Array.isArray(value.arguments) &&
    value.arguments.every(nativeValue)
  )
}

function result(value: unknown): value is NativeResult {
  return (
    record(value) &&
    ((value.ok === true && nativeValue(value.value)) ||
      (value.ok === false &&
        typeof value.message === 'string' &&
        typeof value.name === 'string' &&
        nativeValue(value.properties) &&
        nativeValue(value.thrown)))
  )
}

export function readNativePacket(value: unknown): NativePacket {
  if (record(value)) {
    if (
      value.type === 'call' &&
      typeof value.id === 'string' &&
      invocation(value.invocation)
    )
      return { type: value.type, id: value.id, invocation: value.invocation }
    if (
      value.type === 'result' &&
      typeof value.id === 'string' &&
      result(value.result)
    )
      return { type: value.type, id: value.id, result: value.result }
    if (value.type === 'done' && result(value.result))
      return { type: value.type, result: value.result }
  }
  throw new Error('Invalid native test bridge packet.')
}

export async function* nativePackets(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reachedEnd = false
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) reachedEnd = true
      buffer += decoder.decode(next.value, { stream: !next.done })
      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        if (line) yield readNativePacket(JSON.parse(line))
        newline = buffer.indexOf('\n')
      }
      if (next.done) break
    }
    if (buffer) yield readNativePacket(JSON.parse(buffer))
  } finally {
    try {
      // A terminal packet can end the consumer before the response reaches EOF.
      if (!reachedEnd) await reader.cancel()
    } finally {
      reader.releaseLock()
    }
  }
}

export function nativePacket(packet: NativePacket): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(packet)}\n`)
}
