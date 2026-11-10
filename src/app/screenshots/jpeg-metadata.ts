import {
  ascii,
  byteAt,
  joined,
  u16be,
  u32be,
  u32le,
  UnreadableImage,
} from './image-bytes'

const endOfImage = 0xd9
const startOfScan = 0xda
const exifMarker = 0xe1
const iccMarker = 0xe2
const adobeMarker = 0xee
const commentMarker = 0xfe

function startsWith(bytes: Uint8Array, text: string): boolean {
  return (
    bytes.length >= text.length &&
    [...text].every((letter, at) => bytes[at] === letter.charCodeAt(0))
  )
}

/** A marker without a length: a restart, or the temporary marker. */
function standalone(code: number): boolean {
  return code === 0x01 || (code >= 0xd0 && code <= 0xd7)
}

/**
 * Whether a segment stays. The colour profile and the Adobe colour
 * transform stay, because the pixels need them. Every other application
 * segment goes, such as EXIF, XMP, IPTC, and JFIF with its thumbnail, and
 * so do comments.
 */
function keeps(code: number, data: Uint8Array): boolean {
  if (code === commentMarker) return false
  if (code < 0xe0 || code > 0xef) return true
  if (code === iccMarker) return startsWith(data, 'ICC_PROFILE\0')
  if (code === adobeMarker) return startsWith(data, 'Adobe')
  return false
}

/**
 * The orientation of a photo, 2 to 8, from the first directory of its
 * EXIF data, or null for the normal orientation and for EXIF data that
 * breaks.
 */
function orientationOf(data: Uint8Array): number | null {
  if (!startsWith(data, 'Exif\0\0')) return null
  const tiff = data.subarray(6)
  try {
    const order = ascii(tiff, 0, 2)
    if (order !== 'II' && order !== 'MM') return null
    const little = order === 'II'
    const u16 = (at: number) =>
      little ? byteAt(tiff, at) + byteAt(tiff, at + 1) * 0x100 : u16be(tiff, at)
    const u32 = (at: number) => (little ? u32le(tiff, at) : u32be(tiff, at))
    if (u16(2) !== 42) return null
    const directory = u32(4)
    const count = u16(directory)
    for (let index = 0; index < count; index += 1) {
      const entry = directory + 2 + index * 12
      if (u16(entry) !== 0x0112 || u16(entry + 2) !== 3) continue
      const value = u16(entry + 8)
      return value >= 2 && value <= 8 ? value : null
    }
    return null
  } catch (error) {
    if (error instanceof UnreadableImage) return null
    throw error
  }
}

/**
 * The smallest EXIF segment, with only the orientation, so that a photo
 * keeps its turn. It names no place, no camera, and no time.
 */
function orientationSegment(orientation: number): Uint8Array {
  // prettier-ignore
  return Uint8Array.of(
    0xff, exifMarker, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01,
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01,
    0x00, orientation, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  )
}

/**
 * The end of the coded data of a scan: the first byte of the next marker.
 * A zero after 0xFF and a restart marker belong to the data.
 */
function scanEnd(bytes: Uint8Array, from: number): number {
  let at = from
  while (at < bytes.length) {
    if (bytes[at] !== 0xff) {
      at += 1
      continue
    }
    const next = byteAt(bytes, at + 1)
    if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) at += 2
    else if (next === 0xff) at += 1
    else return at
  }
  throw new UnreadableImage()
}

/**
 * A JPEG file without its metadata: the segments that `keeps` drops go,
 * and so do the bytes after the end of the image, such as the video of a
 * motion photo. When the EXIF data turns the photo, the smallest EXIF
 * segment with that orientation takes its place.
 */
export function stripJpeg(bytes: Uint8Array): Uint8Array {
  const kept: Uint8Array[] = []
  let orientation: number | null = null
  let at = 2
  while (at < bytes.length) {
    if (byteAt(bytes, at) !== 0xff) throw new UnreadableImage()
    while (byteAt(bytes, at) === 0xff) at += 1
    const code = byteAt(bytes, at)
    at += 1
    if (code === endOfImage) {
      const exif = orientation === null ? [] : [orientationSegment(orientation)]
      const end = Uint8Array.of(0xff, endOfImage)
      return joined([bytes.subarray(0, 2), ...exif, ...kept, end])
    }
    if (code === 0x00) throw new UnreadableImage()
    if (standalone(code)) {
      kept.push(Uint8Array.of(0xff, code))
      continue
    }
    const length = u16be(bytes, at)
    const end = at + length
    if (length < 2 || end > bytes.length) throw new UnreadableImage()
    const data = bytes.subarray(at + 2, end)
    if (code === exifMarker) orientation ??= orientationOf(data)
    if (keeps(code, data)) {
      kept.push(Uint8Array.of(0xff, code), bytes.subarray(at, end))
    }
    at = end
    if (code === startOfScan) {
      const dataEnd = scanEnd(bytes, at)
      kept.push(bytes.subarray(at, dataEnd))
      at = dataEnd
    }
  }
  throw new UnreadableImage()
}
