/**
 * The one list of the pictures of the marketing site. Each picture is a
 * still capture of a real screen of the mockups. The marketing mockup, the
 * site, and the capture command all read this list, so no copy of a label,
 * a size, a crop, or a scale can go stale.
 *
 * This module imports nothing, so that the browser bundles, the Worker, and
 * the capture command in Node can all import it.
 */

/** The layouts of the marketing site, which are the views of the mockups. */
export const pictureLayouts = ['desktop', 'mobile'] as const

export type PictureLayout = (typeof pictureLayouts)[number]

/** The colour schemes of each picture file. */
export const pictureSchemes = ['light', 'dark'] as const

export type PictureScheme = (typeof pictureSchemes)[number]

/** A size in CSS px. */
export type ScreenSize = { readonly width: number; readonly height: number }

/** A rectangle of a screen, in CSS px of the screen. */
export type ScreenCrop = ScreenSize & { readonly x: number; readonly y: number }

/** The viewport that a screen of the mockups lays out for. */
export type ScreenViewport = 'desktop' | 'mobile'

/**
 * The size that a screen lays out at: a laptop window, or a phone screen
 * under the status band of the phone.
 */
export const screenSizes: Readonly<Record<ScreenViewport, ScreenSize>> = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 800 },
}

/**
 * How large a page shows a picture: a fixed factor of its CSS px, or
 * `inherit`, which follows the `--frame-scale` of the page.
 */
export type PictureScale = number | 'inherit'

/**
 * How a page frames a picture: a large window that becomes a phone in the
 * phone layout, a quiet excerpt of a screen, or a phone.
 */
export type PictureFrame = 'window-or-phone' | 'excerpt' | 'phone'

/**
 * Whether each layout has its own file, or one file serves both layouts
 * because both show the same part of the same screen.
 */
export type PictureFiles = 'per-layout' | 'shared'

/** A picture in one layout of the site. */
export type PictureView = {
  /** What the picture shows: its alt text, and its label in the mockups. */
  readonly label: string
  /** The viewport of the screen that the picture shows. */
  readonly screen: ScreenViewport
  /** The part of the screen that the picture shows, in CSS px of the screen. */
  readonly crop: ScreenCrop
  /** How large the page shows the part. */
  readonly scale: PictureScale
}

export type MarketingPicture = {
  readonly key: MarketingPictureKey
  readonly frame: PictureFrame
  readonly files: PictureFiles
  readonly desktop: PictureView
  readonly mobile: PictureView
}

/** The pictures, in the order of the home page. */
export const marketingPictureKeys = [
  'hero',
  'starting',
  'agents',
  'review',
  'tools',
  'org',
  'phone',
] as const

export type MarketingPictureKey = (typeof marketingPictureKeys)[number]

/** The scale of an excerpt of a phone screen in the phone layout. */
const phoneExcerpt = 0.84

/** The whole screen of a viewport, as a crop. */
function whole(screen: ScreenViewport): ScreenCrop {
  return { x: 0, y: 0, ...screenSizes[screen] }
}

const heroLabel =
  'The app: a workspace with its chat, its changed files, its terminal, and a pull request that is ready to merge'
const startingLabel =
  'A new workspace: the first message waits while the cloud computer starts and creates the branch'
const reviewLabel =
  'The pull request is ready to merge, over the five changed files and their added and removed lines'
const toolsLabel =
  'The terminal of the cloud computer runs the dev server, beside the Preview and Desktop tabs'
const orgLabel =
  'The cloud computer of the org: its last build, Build computer, and the history of builds'
const phoneLabel =
  'The workspace list on a phone: each workspace shows whether its agent works, is done, or waits'

/**
 * Every picture of the home page. `marketingPictures.tsx` gives each one its
 * screen and the state of the screen.
 */
export const marketingPictures: Readonly<
  Record<MarketingPictureKey, MarketingPicture>
> = {
  hero: {
    key: 'hero',
    frame: 'window-or-phone',
    files: 'per-layout',
    desktop: {
      label: heroLabel,
      screen: 'desktop',
      crop: whole('desktop'),
      scale: 'inherit',
    },
    mobile: {
      label: heroLabel,
      screen: 'mobile',
      crop: whole('mobile'),
      scale: 0.74,
    },
  },
  starting: {
    key: 'starting',
    frame: 'excerpt',
    files: 'per-layout',
    desktop: {
      label: startingLabel,
      screen: 'desktop',
      crop: { x: 281, y: 0, width: 718, height: 330 },
      scale: 0.86,
    },
    mobile: {
      label: startingLabel,
      screen: 'mobile',
      crop: { x: 0, y: 0, width: 390, height: 420 },
      scale: phoneExcerpt,
    },
  },
  agents: {
    key: 'agents',
    frame: 'excerpt',
    files: 'per-layout',
    desktop: {
      label:
        'The composer with attached files, and the open picker of the model and the effort',
      screen: 'desktop',
      crop: { x: 281, y: 466, width: 718, height: 434 },
      scale: 0.86,
    },
    mobile: {
      label:
        'A new agent session beside two others, with the open picker of the model and the effort',
      screen: 'mobile',
      crop: { x: 0, y: 100, width: 390, height: 640 },
      scale: phoneExcerpt,
    },
  },
  review: {
    key: 'review',
    frame: 'excerpt',
    files: 'per-layout',
    desktop: {
      label: reviewLabel,
      screen: 'desktop',
      crop: { x: 1000, y: 0, width: 440, height: 262 },
      scale: 1,
    },
    mobile: {
      label: reviewLabel,
      screen: 'mobile',
      crop: { x: 0, y: 0, width: 390, height: 420 },
      scale: phoneExcerpt,
    },
  },
  tools: {
    key: 'tools',
    frame: 'excerpt',
    files: 'per-layout',
    desktop: {
      label: toolsLabel,
      screen: 'desktop',
      crop: { x: 1000, y: 511, width: 440, height: 350 },
      scale: 1,
    },
    mobile: {
      label: toolsLabel,
      screen: 'mobile',
      crop: { x: 0, y: 0, width: 390, height: 440 },
      scale: phoneExcerpt,
    },
  },
  org: {
    key: 'org',
    frame: 'excerpt',
    files: 'per-layout',
    desktop: {
      label: orgLabel,
      screen: 'desktop',
      crop: { x: 520, y: 76, width: 682, height: 352 },
      scale: 0.9,
    },
    mobile: {
      label: orgLabel,
      screen: 'mobile',
      crop: { x: 0, y: 0, width: 390, height: 500 },
      scale: phoneExcerpt,
    },
  },
  phone: {
    key: 'phone',
    frame: 'phone',
    files: 'shared',
    desktop: {
      label: phoneLabel,
      screen: 'mobile',
      crop: whole('mobile'),
      scale: 0.72,
    },
    mobile: {
      label: phoneLabel,
      screen: 'mobile',
      crop: whole('mobile'),
      scale: 0.74,
    },
  },
}

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
