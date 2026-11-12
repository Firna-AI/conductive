import { ascii, byteAt, joined, u32be, UnreadableImage } from './image-bytes'

/** The PNG signature, which the shared check of the type already read. */
const signatureLength = 8

/**
 * The ancillary chunks that the pixels need: transparency, colour,
 * density, and the frames of an animated PNG. Each other ancillary chunk
 * goes, such as text, EXIF, and the time of the last change.
 */
const keptAncillary = new Set([
  'tRNS',
  'cHRM',
  'gAMA',
  'iCCP',
  'sBIT',
  'sRGB',
  'cICP',
  'mDCV',
  'cLLI',
  'bKGD',
  'hIST',
  'pHYs',
  'sPLT',
  'acTL',
  'fcTL',
  'fdAT',
])

/**
 * A PNG file without its metadata. Each critical chunk stays, because a
 * decoder needs it: a chunk whose type starts with a capital letter. The
 * ancillary chunks stay only when the pixels need them. Bytes after the
 * end chunk go too.
 */
export function stripPng(bytes: Uint8Array): Uint8Array {
  const parts = [bytes.subarray(0, signatureLength)]
  let at = signatureLength
  while (at < bytes.length) {
    const length = u32be(bytes, at)
    const type = ascii(bytes, at + 4, 4)
    const end = at + 12 + length
    if (end > bytes.length) throw new UnreadableImage()
    const critical = (byteAt(bytes, at + 4) & 0x20) === 0
    if (critical || keptAncillary.has(type)) {
      parts.push(bytes.subarray(at, end))
    }
    at = end
    if (type === 'IEND') return joined(parts)
  }
  throw new UnreadableImage()
}
