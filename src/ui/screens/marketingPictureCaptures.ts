/**
 * The files of the pictures of the marketing site, and the capture page of
 * each picture. The capture command writes the files from the capture pages,
 * and the site reads the files by these names, so each file keeps its name
 * on each run.
 *
 * This module imports only the list of the pictures, which imports nothing,
 * so that the browser bundles, the Worker, and the capture command in Node
 * can all import it. The import names the `.ts` file, because Node needs it.
 */
import {
  marketingPictureKeys,
  marketingPictures,
  pictureLayouts,
  type MarketingPicture,
  type MarketingPictureKey,
  type PictureLayout,
  type ScreenSize,
} from './marketingPictureList.ts'

/** The colour schemes of each picture file. */
export const pictureSchemes = ['light', 'dark'] as const

export type PictureScheme = (typeof pictureSchemes)[number]

/**
 * The catalogue path of the capture page of a picture. The page shows the
 * part of the screen of each layout at scale 1, from its top left corner,
 * without a frame. The desktop and mobile views of the page show the
 * desktop and mobile layouts of the picture. Open the page at the size of
 * its screen, because a screen can size a part, such as a menu, from the
 * height of the window.
 */
export function capturePagePath(key: MarketingPictureKey): string {
  return `marketing/pictures/${key}`
}

/** One file of a picture for each scheme, as the capture command writes it. */
export type PictureCapture = {
  readonly key: MarketingPictureKey
  /** The view of the capture page that the command captures. */
  readonly layout: PictureLayout
  /** The layouts of the site that show the file. */
  readonly layouts: readonly PictureLayout[]
  /** The file name without its scheme and its extension. */
  readonly stem: string
  /** The size of the part, at the top left corner of the page, in CSS px. */
  readonly size: ScreenSize
}

function captureOf(
  picture: MarketingPicture,
  layout: PictureLayout,
): PictureCapture {
  const { width, height } = picture[layout].crop
  const shared = picture.files === 'shared'
  return {
    key: picture.key,
    layout,
    layouts: shared ? pictureLayouts : [layout],
    stem: shared ? picture.key : `${picture.key}-${layout}`,
    size: { width, height },
  }
}

/**
 * Every capture of every picture. A shared picture has one capture, from
 * its mobile view, which both layouts show.
 */
export const pictureCaptures: readonly PictureCapture[] =
  marketingPictureKeys.flatMap((key) => {
    const picture = marketingPictures[key]
    if (picture.files === 'shared') return [captureOf(picture, 'mobile')]
    return pictureLayouts.map((layout) => captureOf(picture, layout))
  })

/** The file name of a capture in one scheme, such as `hero-desktop-dark.webp`. */
export function pictureFileName(
  capture: PictureCapture,
  scheme: PictureScheme,
): string {
  return `${capture.stem}-${scheme}.webp`
}
