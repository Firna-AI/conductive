export const escapedCodes: Readonly<Record<number, number>> = {
  34: 34,
  47: 47,
  92: 92,
  98: 8,
  102: 12,
  110: 10,
  114: 13,
  116: 9,
}
const decoder = new TextDecoder()

export function wordCode(code: number | undefined): boolean {
  return (
    code !== undefined &&
    ((code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 95)
  )
}

export function jsonCharacter(bytes: Uint8Array, position: number) {
  const byte = bytes[position]
  if (byte === undefined || byte === 34) return null
  if (byte === 92) {
    const next = bytes[position + 1]
    if (next === 117) {
      const hex = decoder.decode(bytes.subarray(position + 2, position + 6))
      if (/^[0-9a-fA-F]{4}$/.test(hex))
        return {
          value: String.fromCharCode(Number.parseInt(hex, 16)),
          end: position + 6,
        }
    }
    const code = escapedCodes[next]
    if (code !== undefined)
      return { value: String.fromCharCode(code), end: position + 2 }
  }
  const size = byte < 128 ? 1 : byte < 224 ? 2 : byte < 240 ? 3 : 4
  if (position + size > bytes.length) return null
  return {
    value: decoder.decode(bytes.subarray(position, position + size)),
    end: position + size,
  }
}
