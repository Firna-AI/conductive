import { pictureFiles, type SchemeFiles } from './picture-files'

/** The phone layout of the site. The stylesheets use the same width. */
export const phoneMedia = '(max-width: 759.98px)'

/**
 * How a picture is drawn, as the mockup's ScreenFrame draws it: a quiet
 * excerpt of a screen, a phone, or a large window that becomes a phone in
 * the phone layout.
 */
type Frame = 'excerpt' | 'phone' | 'window-or-phone'

/** A fixed factor, or the `--frame-scale` of the hero, which follows the page. */
type FrameScale = number | 'inherit'

/** A picture in one layout: what it shows, and the part of the screen. */
type PictureView = {
  alt: string
  files: SchemeFiles
  /** The part of the screen that the picture shows, in px of the screen. */
  width: number
  height: number
  scale: FrameScale
}

export type PictureKey = keyof typeof pictureFiles

export type Picture = {
  key: PictureKey
  frame: Frame
  desktop: PictureView
  mobile: PictureView
}

/** The scale of an excerpt of a phone screen in the phone layout. */
const phoneExcerpt = 0.84

function view(
  key: PictureKey,
  layout: 'desktop' | 'mobile',
  alt: string,
  box: { width: number; height: number; scale: FrameScale },
): PictureView {
  return { alt, files: pictureFiles[key][layout], ...box }
}

const heroAlt =
  'The app: a workspace with its chat, its changed files, its terminal, and a pull request that is ready to merge'
const startingAlt =
  'A new workspace: the first message waits while the cloud computer starts and creates the branch'
const reviewAlt =
  'The pull request is ready to merge, over the five changed files and their added and removed lines'
const toolsAlt =
  'The terminal of the cloud computer runs the dev server, beside the Preview and Desktop tabs'
const orgAlt =
  'The cloud computer of the org: its last build, Build computer, and the history of builds'
const phoneAlt =
  'The workspace list on a phone: each workspace shows whether its agent works, is done, or waits'

/**
 * The pictures of the home page. Each one shows the screen, the state, and
 * the part of it that docs/mockups/src/screens/marketingPictures.tsx
 * chooses, at the same size and scale.
 */
export const pictures: Readonly<Record<PictureKey, Picture>> = {
  hero: {
    key: 'hero',
    frame: 'window-or-phone',
    desktop: view('hero', 'desktop', heroAlt, {
      width: 1440,
      height: 900,
      scale: 'inherit',
    }),
    mobile: view('hero', 'mobile', heroAlt, {
      width: 390,
      height: 800,
      scale: 0.74,
    }),
  },
  starting: {
    key: 'starting',
    frame: 'excerpt',
    desktop: view('starting', 'desktop', startingAlt, {
      width: 718,
      height: 330,
      scale: 0.86,
    }),
    mobile: view('starting', 'mobile', startingAlt, {
      width: 390,
      height: 420,
      scale: phoneExcerpt,
    }),
  },
  agents: {
    key: 'agents',
    frame: 'excerpt',
    desktop: view(
      'agents',
      'desktop',
      'The composer with two attached files, and the open picker of the model and the effort',
      { width: 718, height: 434, scale: 0.86 },
    ),
    mobile: view(
      'agents',
      'mobile',
      'A new agent session beside two others, with the open picker of the model and the effort',
      { width: 390, height: 640, scale: phoneExcerpt },
    ),
  },
  review: {
    key: 'review',
    frame: 'excerpt',
    desktop: view('review', 'desktop', reviewAlt, {
      width: 440,
      height: 262,
      scale: 1,
    }),
    mobile: view('review', 'mobile', reviewAlt, {
      width: 390,
      height: 420,
      scale: phoneExcerpt,
    }),
  },
  tools: {
    key: 'tools',
    frame: 'excerpt',
    desktop: view('tools', 'desktop', toolsAlt, {
      width: 440,
      height: 350,
      scale: 1,
    }),
    mobile: view('tools', 'mobile', toolsAlt, {
      width: 390,
      height: 440,
      scale: phoneExcerpt,
    }),
  },
  org: {
    key: 'org',
    frame: 'excerpt',
    desktop: view('org', 'desktop', orgAlt, {
      width: 682,
      height: 352,
      scale: 0.9,
    }),
    mobile: view('org', 'mobile', orgAlt, {
      width: 390,
      height: 500,
      scale: phoneExcerpt,
    }),
  },
  phone: {
    key: 'phone',
    frame: 'phone',
    desktop: view('phone', 'desktop', phoneAlt, {
      width: 390,
      height: 800,
      scale: 0.72,
    }),
    mobile: view('phone', 'mobile', phoneAlt, {
      width: 390,
      height: 800,
      scale: 0.74,
    }),
  },
}
