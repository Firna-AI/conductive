import { deflateSync } from 'node:zlib'

// Image files for the tests of the screenshots: their parts, with the
// metadata of a phone photo, such as the place where it was taken.

/** Bytes from numbers, ASCII text, and arrays, in their order. */
export function bytes(
  ...parts: (number | string | Uint8Array)[]
): Uint8Array<ArrayBuffer> {
  const arrays = parts.map((part) => {
    if (typeof part === 'number') return Uint8Array.of(part)
    if (typeof part === 'string') {
      return Uint8Array.from(part, (letter) => letter.charCodeAt(0))
    }
    return part
  })
  const result = new Uint8Array(
    arrays.reduce((sum, array) => sum + array.length, 0),
  )
  let at = 0
  for (const array of arrays) {
    result.set(array, at)
    at += array.length
  }
  return result
}

function be16(value: number): Uint8Array<ArrayBuffer> {
  return bytes(value >>> 8, value & 0xff)
}

function be32(value: number): Uint8Array<ArrayBuffer> {
  return bytes(be16(value >>> 16), be16(value & 0xffff))
}

function le32(value: number): Uint8Array<ArrayBuffer> {
  return bytes(be32(value).reverse())
}

/** Whether `part` shows up in `whole`, such as the bytes of a latitude. */
export function includes(whole: Uint8Array, part: Uint8Array): boolean {
  for (let at = 0; at + part.length <= whole.length; at += 1) {
    if (part.every((value, index) => whole[at + index] === value)) return true
  }
  return false
}

/** The latitude of the photo, 51° 30′ 26″ north, as three EXIF rationals. */
// prettier-ignore
export const latitude = bytes(be32(51), be32(1), be32(30), be32(1), be32(26), be32(1))
const longitude = bytes(be32(0), be32(1), be32(7), be32(1), be32(39), be32(1))

/**
 * The TIFF data of EXIF, the high byte first: the first directory turns the
 * photo by `orientation` and points to the GPS directory, which names the
 * place where the photo was taken.
 */
export function exifTiff(orientation: number): Uint8Array<ArrayBuffer> {
  const gpsAt = 8 + 2 + 2 * 12 + 4
  const valuesAt = gpsAt + 2 + 4 * 12 + 4
  // Each row is one entry of a directory: its tag, type, count, and value.
  // prettier-ignore
  return bytes(
    'MM', be16(42), be32(8),
    be16(2),
    be16(0x0112), be16(3), be32(1), be16(orientation), be16(0),
    be16(0x8825), be16(4), be32(1), be32(gpsAt),
    be32(0),
    be16(4),
    be16(1), be16(2), be32(2), 'N', 0, 0, 0,
    be16(2), be16(5), be32(3), be32(valuesAt),
    be16(3), be16(2), be32(2), 'W', 0, 0, 0,
    be16(4), be16(5), be32(3), be32(valuesAt + latitude.length),
    be32(0),
    latitude,
    longitude,
  )
}

/** A JPEG segment: the marker, then the length and the data. */
export function jpegSegment(
  marker: number,
  data: Uint8Array | string,
): Uint8Array<ArrayBuffer> {
  const body = typeof data === 'string' ? bytes(data) : data
  return bytes(0xff, marker, be16(body.length + 2), body)
}

/** A PNG chunk with its length, its type, its data, and a CRC of zero. */
export function pngChunk(
  type: string,
  data: Uint8Array | string,
): Uint8Array<ArrayBuffer> {
  const body = typeof data === 'string' ? bytes(data) : data
  return bytes(be32(body.length), type, body, be32(0))
}

export const pngSignature = bytes(137, 80, 78, 71, 13, 10, 26, 10)

/** The header of a PNG of `width` by 1 pixels, 8-bit RGBA. */
export function pngHeader(width = 1): Uint8Array<ArrayBuffer> {
  return pngChunk('IHDR', bytes(be32(width), be32(1), 8, 6, 0, 0, 0))
}

/** A real PNG of one red pixel, with no metadata. */
export function redPixelPng(): Uint8Array<ArrayBuffer> {
  const data = deflateSync(bytes(0, 255, 0, 0, 255))
  return bytes(
    pngSignature,
    pngHeader(),
    pngChunk('IDAT', data),
    pngChunk('IEND', ''),
  )
}

/**
 * A PNG of `size` bytes in all, with no metadata: its image data fills it.
 * It serves where only the size counts, such as the limit of 7 MB.
 */
export function pngOfSize(size: number): Uint8Array<ArrayBuffer> {
  const frame = pngSignature.length + 25 + 12 + 12
  return bytes(
    pngSignature,
    pngHeader(),
    pngChunk('IDAT', new Uint8Array(size - frame)),
    pngChunk('IEND', ''),
  )
}

/** A WebP chunk: its type, its size, its data, and a pad to an even size. */
export function webpChunk(
  type: string,
  data: Uint8Array | string,
): Uint8Array<ArrayBuffer> {
  const body = typeof data === 'string' ? bytes(data) : data
  return bytes(
    type,
    le32(body.length),
    body,
    body.length % 2 === 1 ? bytes(0) : bytes(),
  )
}

/** A RIFF container of WebP around the chunks. */
export function webp(...chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const body = bytes(...chunks)
  return bytes('RIFF', le32(4 + body.length), 'WEBP', body)
}

/** A run of GIF data sub-blocks, with the empty terminator. */
export function gifBlocks(data: string): Uint8Array<ArrayBuffer> {
  return bytes(data.length, data, 0)
}
