const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true })

export function statusOutputSlice(text: string, offset: number, limit: number) {
  const bytes = encoder.encode(text)
  let end = Math.min(offset + limit, bytes.length)
  // Encoded text ends on a character boundary. A shorter slice can cut one.
  while (end > offset && end < bytes.length && (bytes[end] & 0xc0) === 0x80)
    end--
  const slice = bytes.subarray(offset, end)
  return {
    text: decoder.decode(slice),
    nextOffset: offset + slice.length,
    more: end < bytes.length,
  }
}
