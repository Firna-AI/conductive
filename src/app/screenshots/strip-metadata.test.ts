import { describe, expect, test } from 'vitest'
import { readImage } from '../../shared/images'
import { UnreadableImage } from './image-bytes'
import {
  bytes,
  exifTiff,
  gifBlocks,
  includes,
  jpegSegment,
  latitude,
  pngChunk,
  pngHeader,
  pngSignature,
  webp,
  webpChunk,
} from './images.test-support'
import { stripMetadata } from './strip-metadata'

/** The bytes without metadata, after the shared check of the type. */
function stripped(file: Uint8Array): Uint8Array {
  const image = readImage(file)
  if (image === null) throw new Error('The test file is no image.')
  return stripMetadata(image)
}

// The parts of a JPEG photo that the pixels need.
const iccProfile = jpegSegment(
  0xe2,
  bytes('ICC_PROFILE', 0, 1, 1, 'Display P3'),
)
const quantization = jpegSegment(0xdb, bytes(0, new Uint8Array(64).fill(1)))
const frame = jpegSegment(0xc0, bytes(8, 0, 1, 0, 1, 1, 1, 0x11, 0))
const huffman = jpegSegment(0xc4, bytes(0, new Uint8Array(17).fill(0)))
const scan = jpegSegment(0xda, bytes(1, 1, 0, 0, 0x3f, 0))
// Coded data with a stuffed 0xFF and a restart marker, which belong to it.
const coded = bytes(0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78)
const pixels = bytes(quantization, frame, huffman, scan, coded)
const startOfImage = bytes(0xff, 0xd8)
const endOfImage = bytes(0xff, 0xd9)

// The smallest EXIF segment: the orientation 6 alone, the high byte first.
// prettier-ignore
const turnedSix = bytes(
  0xff, 0xe1, 0x00, 0x22, 'Exif', 0, 0,
  'MM', 0, 42, 0, 0, 0, 8,
  0, 1,
  0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0,
  0, 0, 0, 0,
)

describe('the metadata of a screenshot', () => {
  test('a JPEG photo loses the place where it was taken and its other metadata, and keeps its pixels, its colour profile, and its orientation', () => {
    const photo = bytes(
      startOfImage,
      jpegSegment(0xe0, bytes('JFIF', 0, 1, 1, 0, 0, 1, 0, 1, 0, 0)),
      jpegSegment(0xe1, bytes('Exif', 0, 0, exifTiff(6))),
      iccProfile,
      jpegSegment(0xfe, 'Taken at 12 Acacia Avenue'),
      pixels,
      endOfImage,
      'MotionPhoto_Data',
    )
    const result = stripped(photo)
    expect({ location: includes(result, latitude), result }).toEqual({
      location: false,
      result: bytes(startOfImage, turnedSix, iccProfile, pixels, endOfImage),
    })
  })

  test('a PNG loses its EXIF, text, time, and private chunks, and bytes after its end, and keeps the chunks that its pixels need', () => {
    const kept = [
      pngHeader(),
      pngChunk('iCCP', bytes('Display P3', 0, 0, 9, 9)),
      pngChunk('pHYs', bytes(0, 0, 11, 19, 0, 0, 11, 19, 1)),
      pngChunk('IDAT', bytes(1, 2, 3)),
    ]
    const file = bytes(
      pngSignature,
      kept[0],
      pngChunk('eXIf', exifTiff(1)),
      kept[1],
      pngChunk('tEXt', 'Location\u0000Acacia Avenue'),
      kept[2],
      pngChunk('iDOT', bytes(0, 0, 0, 2)),
      kept[3],
      pngChunk('tIME', bytes(7, 234, 11, 10, 14, 32, 5)),
      pngChunk('IEND', ''),
      'zip-data',
    )
    expect(stripped(file)).toEqual(
      bytes(pngSignature, ...kept, pngChunk('IEND', '')),
    )
  })

  test('a WebP loses its EXIF and XMP chunks, its header no longer names them, and its container size counts what stays', () => {
    const vp8x = (flags: number) =>
      webpChunk('VP8X', bytes(flags, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    const kept = [
      webpChunk('ICCP', 'Display P3'),
      webpChunk('ALPH', bytes(0, 255)),
      webpChunk('VP8 ', bytes(1, 2, 3)),
    ]
    const file = webp(
      vp8x(0x3c),
      ...kept,
      webpChunk('EXIF', exifTiff(6)),
      webpChunk('XMP ', '<rdf:Description exif:GPSLatitude="51,30.43N"/>'),
    )
    const result = stripped(file)
    expect({ location: includes(result, latitude), result }).toEqual({
      location: false,
      result: webp(vp8x(0x30), ...kept),
    })
  })

  test('a GIF loses its comments, its XMP, and bytes after its end, and keeps its frames and its loops', () => {
    const screen = bytes(
      'GIF89a',
      1,
      0,
      1,
      0,
      0x80,
      0,
      0,
      0,
      0,
      0,
      255,
      255,
      255,
    )
    const loops = bytes(0x21, 0xff, 11, 'NETSCAPE2.0', 3, 1, 0, 0, 0)
    const timing = bytes(0x21, 0xf9, 4, 0, 10, 0, 0, 0)
    const image = bytes(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0)
    const file = bytes(
      screen,
      loops,
      0x21,
      0xff,
      11,
      'XMP DataXMP',
      gifBlocks('<x:xmpmeta>Acacia Avenue'),
      0x21,
      0xfe,
      gifBlocks('Taken at home'),
      timing,
      image,
      0x3b,
      'after',
    )
    expect(stripped(file)).toEqual(bytes(screen, loops, timing, image, 0x3b))
  })

  test('a file whose structure breaks is unreadable, so no metadata of it can stay', () => {
    const cut = bytes(
      pngSignature,
      pngHeader(),
      bytes(0, 0, 1, 0),
      'IDAT',
      1,
      2,
    )
    const noEnd = bytes(startOfImage, pixels)
    const outcome = (file: Uint8Array) => {
      try {
        return stripped(file).length
      } catch (error) {
        return error instanceof UnreadableImage ? 'unreadable' : error
      }
    }
    expect({ png: outcome(cut), jpeg: outcome(noEnd) }).toEqual({
      png: 'unreadable',
      jpeg: 'unreadable',
    })
  })
})
