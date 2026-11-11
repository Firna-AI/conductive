import type { CheckedImage } from '../../shared/images'
import { stripGif } from './gif-metadata'
import { stripJpeg } from './jpeg-metadata'
import { stripPng } from './png-metadata'
import { stripWebp } from './webp-metadata'

/**
 * The bytes of a checked image without its metadata, such as the place
 * where a photo was taken, its camera, its time, its comments, and its
 * thumbnails. The pixels, the colour profile, the transparency, and the
 * frames of an animation stay, and so does the orientation of a JPEG
 * photo, so the image looks the same. The type and the first bytes do not
 * change. A file whose structure breaks throws `UnreadableImage`.
 */
export function stripMetadata(image: CheckedImage): Uint8Array {
  switch (image.kind) {
    case 'png':
      return stripPng(image.bytes)
    case 'jpeg':
      return stripJpeg(image.bytes)
    case 'gif':
      return stripGif(image.bytes)
    case 'webp':
      return stripWebp(image.bytes)
  }
}

/** The bytes as base64, as the body of a send carries each screenshot. */
export function toBase64(bytes: Uint8Array): string {
  const step = 0x8000
  let binary = ''
  for (let at = 0; at < bytes.length; at += step) {
    binary += String.fromCharCode(...bytes.subarray(at, at + step))
  }
  return btoa(binary)
}
