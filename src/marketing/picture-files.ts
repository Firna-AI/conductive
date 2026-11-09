/// <reference types="vite/client" />
import {
  pictureCaptures,
  pictureFileName,
  type MarketingPictureKey,
  type PictureLayout,
  type PictureScheme,
} from '../../docs/mockups/src/screens/marketingPictureList'

/** The address of a file of a picture in each colour scheme. */
type SchemeFiles = Readonly<Record<PictureScheme, string>>

/** The address of the file of one picture in each layout and scheme. */
type PictureFiles = Readonly<Record<PictureLayout, SchemeFiles>>

/**
 * The address of each file in `pictures/`, by its path from this module.
 * The build bundles each file that the pattern matches, as an import of the
 * file does, and gives it an address under the static assets of the Worker.
 */
const bundledFiles = new Map(
  Object.entries(
    import.meta.glob<string>('./pictures/*.webp', {
      eager: true,
      import: 'default',
    }),
  ),
)

/**
 * The address of a file that the list of the pictures names. A missing file
 * stops the site, as a missing import of the file does.
 */
function fileAddress(name: string): string {
  const address = bundledFiles.get(`./pictures/${name}`)
  if (address === undefined) {
    throw new Error(
      `src/marketing/pictures/${name} is missing. Capture the pictures with npm run marketing:pictures.`,
    )
  }
  return address
}

/**
 * The files of each capture of the list, with the layouts of the site that
 * show them. Each picture is a real screen of the mockups, captured at two
 * device pixels for each CSS pixel.
 */
const captureFiles = pictureCaptures.map((capture) => {
  const files: SchemeFiles = {
    light: fileAddress(pictureFileName(capture, 'light')),
    dark: fileAddress(pictureFileName(capture, 'dark')),
  }
  return { capture, files }
})

/** The files that one layout of the site shows for a picture. */
function layoutFiles(
  key: MarketingPictureKey,
  layout: PictureLayout,
): SchemeFiles {
  const shown = captureFiles.find(
    ({ capture }) => capture.key === key && capture.layouts.includes(layout),
  )
  if (shown === undefined) {
    throw new Error(
      `The list of the pictures gives no file of ${key} for the ${layout} layout.`,
    )
  }
  return shown.files
}

/**
 * The still pictures of the home page, in each layout and scheme. The phone
 * picture is one phone screen, which both layouts show.
 */
export function pictureFiles(key: MarketingPictureKey): PictureFiles {
  return {
    desktop: layoutFiles(key, 'desktop'),
    mobile: layoutFiles(key, 'mobile'),
  }
}

/** Every address of a picture file, for the asset routes of the site. */
export const pictureFileUrls: readonly string[] = captureFiles.flatMap(
  ({ files }) => [files.light, files.dark],
)
