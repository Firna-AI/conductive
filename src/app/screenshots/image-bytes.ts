/**
 * The structure of an image file breaks, such as a part that runs past the
 * end of the file. Its metadata cannot be found with certainty, so the
 * dialog does not add the file.
 */
export class UnreadableImage extends Error {
  constructor() {
    super('The image file is damaged.')
    this.name = 'UnreadableImage'
  }
}

/** The byte at `at`. A position past the end breaks the file. */
export function byteAt(bytes: Uint8Array, at: number): number {
  const value = bytes[at]
  if (value === undefined) throw new UnreadableImage()
  return value
}

/** A 16-bit number, the high byte first. */
export function u16be(bytes: Uint8Array, at: number): number {
  return byteAt(bytes, at) * 0x100 + byteAt(bytes, at + 1)
}

/** A 32-bit number, the high byte first. */
export function u32be(bytes: Uint8Array, at: number): number {
  return u16be(bytes, at) * 0x10000 + u16be(bytes, at + 2)
}

/** A 32-bit number, the low byte first. */
export function u32le(bytes: Uint8Array, at: number): number {
  return (
    byteAt(bytes, at) +
    byteAt(bytes, at + 1) * 0x100 +
    byteAt(bytes, at + 2) * 0x10000 +
    byteAt(bytes, at + 3) * 0x1000000
  )
}

/** The ASCII text of `length` bytes, such as the type of a chunk. */
export function ascii(bytes: Uint8Array, at: number, length: number): string {
  if (at + length > bytes.length) throw new UnreadableImage()
  return String.fromCharCode(...bytes.subarray(at, at + length))
}

/** The parts, joined in their order into one new array. */
export function joined(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    result.set(part, at)
    at += part.length
  }
  return result
}
