import { ascii, byteAt, joined, u32le, UnreadableImage } from './image-bytes'

/**
 * The chunks that the pixels need: the image data, the extended header,
 * the alpha, the animation and its frames, and the colour profile. Each
 * other chunk goes, such as EXIF and XMP.
 */
const keptChunks = new Set([
  'VP8 ',
  'VP8L',
  'VP8X',
  'ALPH',
  'ANIM',
  'ANMF',
  'ICCP',
])

/** The flags of the extended header that say that EXIF and XMP follow. */
const metadataFlags = 0x08 | 0x04

/** A 32-bit number, the low byte first, as four bytes. */
function le32(value: number): Uint8Array {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  )
}

/**
 * A WebP file without its metadata: the chunks that `keptChunks` names
 * stay, the extended header no longer says that metadata follows, and the
 * size of the RIFF container counts what stays. Bytes after the container
 * go too.
 */
export function stripWebp(bytes: Uint8Array): Uint8Array {
  const end = 8 + u32le(bytes, 4)
  if (end > bytes.length) throw new UnreadableImage()
  const chunks: Uint8Array[] = []
  let at = 12
  while (at < end) {
    const type = ascii(bytes, at, 4)
    const size = u32le(bytes, at + 4)
    const next = at + 8 + size + (size % 2)
    if (next > end) throw new UnreadableImage()
    if (type === 'VP8X') {
      const header = bytes.slice(at, next)
      header[8] = byteAt(header, 8) & ~metadataFlags
      chunks.push(header)
    } else if (keptChunks.has(type)) {
      chunks.push(bytes.subarray(at, next))
    }
    at = next
  }
  const body = joined(chunks)
  return joined([
    bytes.subarray(0, 4),
    le32(4 + body.length),
    bytes.subarray(8, 12),
    body,
  ])
}
