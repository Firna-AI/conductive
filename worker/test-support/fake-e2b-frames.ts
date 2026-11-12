function frame(value: unknown, terminal = false): Uint8Array {
  const payload = new TextEncoder().encode(JSON.stringify(value))
  const bytes = new Uint8Array(payload.byteLength + 5)
  bytes[0] = terminal ? 2 : 0
  new DataView(bytes.buffer).setUint32(1, payload.byteLength)
  bytes.set(payload, 5)
  return bytes
}

export function fakeE2bFrames(
  events: readonly unknown[],
  chunkBytes = 0,
): Response {
  const frames = [...events.map((event) => frame(event)), frame({}, true)]
  const bytes = new Uint8Array(
    frames.reduce((total, value) => total + value.byteLength, 0),
  )
  let offset = 0
  for (const current of frames) {
    bytes.set(current, offset)
    offset += current.byteLength
  }
  let cursor = 0
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (cursor === bytes.byteLength) {
          controller.close()
          return
        }
        const end = Math.min(
          bytes.byteLength,
          cursor + (chunkBytes || bytes.byteLength),
        )
        controller.enqueue(bytes.subarray(cursor, end))
        cursor = end
      },
    }),
  )
}

export async function fakeE2bStartConfig(
  request: Request,
): Promise<Record<string, unknown>> {
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (
    bytes.byteLength < 5 ||
    bytes[0] !== 0 ||
    new DataView(bytes.buffer).getUint32(1) !== bytes.byteLength - 5
  )
    throw new Error('Invalid fake E2B request frame.')
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes.subarray(5)))
  if (typeof value !== 'object' || value === null || !('process' in value))
    throw new Error('Missing fake E2B process.')
  const process = value.process
  if (
    typeof process !== 'object' ||
    process === null ||
    !('args' in process) ||
    !Array.isArray(process.args)
  )
    throw new Error('Missing fake E2B process arguments.')
  const encoded: unknown = process.args.at(-1)
  if (typeof encoded !== 'string')
    throw new Error('Missing fake E2B process config.')
  const config: unknown = JSON.parse(encoded)
  if (typeof config !== 'object' || config === null || Array.isArray(config))
    throw new Error('Invalid fake E2B config.')
  return Object.fromEntries(Object.entries(config))
}
