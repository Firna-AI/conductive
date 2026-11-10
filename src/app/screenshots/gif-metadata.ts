import { ascii, byteAt, joined, UnreadableImage } from './image-bytes'

/** The header and the logical screen descriptor, before the colour table. */
const screenLength = 13
const imageBlock = 0x2c
const extensionBlock = 0x21
const trailer = 0x3b

/** The size of a colour table, from the flags of its descriptor. */
function tableSize(flags: number): number {
  return (flags & 0x80) === 0 ? 0 : 3 * 2 ** ((flags & 0x07) + 1)
}

/** The end of a run of data sub-blocks, just after its empty terminator. */
function subBlocksEnd(bytes: Uint8Array, from: number): number {
  let at = from
  for (;;) {
    const size = byteAt(bytes, at)
    at += 1
    if (size === 0) return at
    at += size
  }
}

/** The application extensions that drive an animation, such as its loops. */
const keptApplications = new Set(['NETSCAPE2.0', 'ANIMEXTS1.0'])

/**
 * Whether an extension stays: the frame timing, the plain text that shows,
 * and the loops of an animation. Comments go, and so do other application
 * extensions, such as XMP, and unknown extensions.
 */
function keepsExtension(bytes: Uint8Array, at: number): boolean {
  const label = byteAt(bytes, at + 1)
  if (label === 0xf9 || label === 0x01) return true
  if (label !== 0xff) return false
  return (
    byteAt(bytes, at + 2) === 11 &&
    keptApplications.has(ascii(bytes, at + 3, 11))
  )
}

/** A GIF file without its metadata, as `keepsExtension` says, and without bytes after its trailer. */
export function stripGif(bytes: Uint8Array): Uint8Array {
  let at = screenLength + tableSize(byteAt(bytes, 10))
  if (at > bytes.length) throw new UnreadableImage()
  const parts = [bytes.subarray(0, at)]
  for (;;) {
    const block = byteAt(bytes, at)
    if (block === trailer) {
      parts.push(Uint8Array.of(trailer))
      return joined(parts)
    }
    let end: number
    if (block === imageBlock) {
      const codeSize = at + 10 + tableSize(byteAt(bytes, at + 9))
      end = subBlocksEnd(bytes, codeSize + 1)
      parts.push(bytes.subarray(at, end))
    } else if (block === extensionBlock) {
      end = subBlocksEnd(bytes, at + 2)
      if (keepsExtension(bytes, at)) parts.push(bytes.subarray(at, end))
    } else {
      throw new UnreadableImage()
    }
    at = end
  }
}
