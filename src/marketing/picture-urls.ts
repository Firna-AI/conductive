import {
  pictureCaptures,
  pictureFileName,
  pictureSchemes,
  type MarketingPictureKey,
  type PictureCapture,
  type PictureLayout,
  type PictureScheme,
} from '../../docs/mockups/src/screens/marketingPictureList'

/**
 * The address of each picture file of `pictures/`, by its path from this
 * module. The build gives each file an address under the static assets.
 */
const fileUrls: Readonly<Partial<Record<string, string>>> = import.meta.glob(
  './pictures/*.webp',
  { query: '?url', import: 'default', eager: true },
)

function captureUrl(
  capture: PictureCapture,
  scheme: PictureScheme,
): string | undefined {
  return fileUrls[`./pictures/${pictureFileName(capture, scheme)}`]
}

const missingFiles = pictureCaptures.flatMap((capture) =>
  pictureSchemes
    .filter((scheme) => captureUrl(capture, scheme) === undefined)
    .map((scheme) => pictureFileName(capture, scheme)),
)

if (missingFiles.length > 0) {
  throw new Error(
    `These pictures of the marketing picture list have no file in src/marketing/pictures/: ${missingFiles.join(', ')}. Capture them with npm run marketing:pictures.`,
  )
}

/**
 * The address of the file of a picture in one layout and one colour
 * scheme, from the shared list of the pictures.
 */
export function pictureUrl(
  key: MarketingPictureKey,
  layout: PictureLayout,
  scheme: PictureScheme,
): string {
  const capture = pictureCaptures.find(
    (item) => item.key === key && item.layouts.includes(layout),
  )
  const url = capture && captureUrl(capture, scheme)
  if (url === undefined) {
    throw new Error(`The picture ${key} has no ${layout} capture in the list.`)
  }
  return url
}
