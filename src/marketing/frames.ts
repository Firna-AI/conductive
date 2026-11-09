import {
  marketingPictureKeys,
  marketingPictures,
  type MarketingPictureKey,
  type PictureFrame,
  type PictureLayout,
} from '../../docs/mockups/src/screens/marketingPictureList'
import { html, type Html } from './html'
import { pictureFiles } from './picture-files'

/** The phone layout of the site. The stylesheets use the same width. */
const phoneMedia = '(max-width: 759.98px)'

type Loading = 'eager' | 'lazy'

const lightMedia = '(prefers-color-scheme: light)'

function source(media: string, url: string): Html {
  return html`<source media="${media}" srcset="${url}" />`
}

/**
 * The image of a picture in one layout: its dark file, its text, and the
 * size of its part of the screen, from the shared list of the pictures.
 */
function image(
  key: MarketingPictureKey,
  layout: PictureLayout,
  loading: Loading,
): Html {
  const { label, crop } = marketingPictures[key][layout]
  const priority = loading === 'eager' ? 'high' : 'auto'
  return html`<img
    src="${pictureFiles(key)[layout].dark}"
    alt="${label}"
    width="${crop.width}"
    height="${crop.height}"
    loading="${loading}"
    decoding="async"
    fetchpriority="${priority}"
  />`
}

/**
 * The still image of a picture. The browser picks the file for the layout
 * and the colour scheme. When the two layouts show different things, each
 * layout gets its own image with its own text, and the other one hides.
 */
function images(key: MarketingPictureKey, loading: Loading): Html {
  const { desktop, mobile } = marketingPictures[key]
  const files = pictureFiles(key)
  if (desktop.label !== mobile.label) {
    return html`<picture class="for-desktop"
        >${source(lightMedia, files.desktop.light)}${image(key, 'desktop', loading)}</picture
      ><picture class="for-mobile"
        >${source(lightMedia, files.mobile.light)}${image(key, 'mobile', loading)}</picture
      >`
  }
  return html`<picture
    >${source(`${phoneMedia} and ${lightMedia}`, files.mobile.light)}${source(phoneMedia, files.mobile.dark)}${source(lightMedia, files.desktop.light)}${image(key, 'desktop', loading)}</picture
  >`
}

const frameClasses: Readonly<Record<PictureFrame, string>> = {
  excerpt: 'frame-excerpt',
  phone: 'frame-phone',
  'window-or-phone': 'frame-window frame-mobile-phone',
}

/**
 * A real screen of the app as a still picture in its frame: an excerpt, a
 * phone, or a window. A picture holds no link and no control.
 */
export function pictureFrame(key: MarketingPictureKey, loading: Loading): Html {
  const { frame } = marketingPictures[key]
  const content = images(key, loading)
  const inner =
    frame === 'excerpt'
      ? content
      : html`<div class="phone-screen">
          <div class="phone-band"><span class="phone-notch"></span></div>
          ${content}
        </div>`
  return html`<div class="frame ${frameClasses[frame]} picture-${key}">
    ${inner}
  </div>`
}

/** The size of a picture in one layout, and the scale of its phone. */
function viewRules(
  selector: string,
  key: MarketingPictureKey,
  layout: PictureLayout,
): string {
  const { crop, scale } = marketingPictures[key][layout]
  const { width, height } = crop
  if (scale === 'inherit') {
    return `${selector} img{width:calc(${width}px * var(--frame-scale));aspect-ratio:${width}/${height}}`
  }
  return `${selector}{--phone-scale:${scale}}${selector} img{width:${width * scale}px;aspect-ratio:${width}/${height}}`
}

/**
 * The size of each picture in each layout, and the scale of each phone. It
 * uses the arithmetic of the mockup, so each picture has the mockup's size.
 */
export function picturesCss(): string {
  return marketingPictureKeys
    .map((key) => {
      const selector = `.picture-${key}`
      return `${viewRules(selector, key, 'desktop')}@media ${phoneMedia}{${viewRules(selector, key, 'mobile')}}`
    })
    .join('')
}
