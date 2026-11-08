import {
  marketingPictures,
  type MarketingPictureKey,
  type PictureLayout,
} from '../../docs/mockups/src/screens/marketingPictureList'
import { html, type Html } from './html'
import { pictureFiles } from './picture-files'
import { frameClasses, lightMedia, phoneMedia } from './picture-styles'

/** `styles.ts` reads the size of each picture from here. */
export { picturesCss } from './picture-styles'

type Loading = 'eager' | 'lazy'

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
    src="${pictureFiles[key][layout].dark}"
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
  const files = pictureFiles[key]
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
