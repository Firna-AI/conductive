import { html, type Html } from './html'
import { phoneMedia, pictures, type Picture } from './pictures'

type Loading = 'eager' | 'lazy'

type PictureView = Picture['desktop']

const lightMedia = '(prefers-color-scheme: light)'

function source(media: string, url: string): Html {
  return html`<source media="${media}" srcset="${url}" />`
}

function image(picture: PictureView, loading: Loading): Html {
  const priority = loading === 'eager' ? 'high' : 'auto'
  return html`<img
    src="${picture.files.dark}"
    alt="${picture.alt}"
    width="${picture.width}"
    height="${picture.height}"
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
function images(picture: Picture, loading: Loading): Html {
  const { desktop, mobile } = picture
  if (desktop.alt !== mobile.alt) {
    return html`<picture class="for-desktop"
        >${source(lightMedia, desktop.files.light)}${image(desktop, loading)}</picture
      ><picture class="for-mobile"
        >${source(lightMedia, mobile.files.light)}${image(mobile, loading)}</picture
      >`
  }
  return html`<picture
    >${source(`${phoneMedia} and ${lightMedia}`, mobile.files.light)}${source(phoneMedia, mobile.files.dark)}${source(lightMedia, desktop.files.light)}${image(desktop, loading)}</picture
  >`
}

const frameClasses: Readonly<Record<Picture['frame'], string>> = {
  excerpt: 'frame-excerpt',
  phone: 'frame-phone',
  'window-or-phone': 'frame-window frame-mobile-phone',
}

/**
 * A real screen of the app as a still picture in its frame: an excerpt, a
 * phone, or a window. A picture holds no link and no control.
 */
export function pictureFrame(picture: Picture, loading: Loading): Html {
  const content = images(picture, loading)
  const inner =
    picture.frame === 'excerpt'
      ? content
      : html`<div class="phone-screen">
          <div class="phone-band"><span class="phone-notch"></span></div>
          ${content}
        </div>`
  return html`<div
    class="frame ${frameClasses[picture.frame]} picture-${picture.key}"
  >
    ${inner}
  </div>`
}

function viewRules(selector: string, picture: PictureView): string {
  const { width, height, scale } = picture
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
  return Object.values(pictures)
    .map((picture) => {
      const selector = `.picture-${picture.key}`
      return `${viewRules(selector, picture.desktop)}@media ${phoneMedia}{${viewRules(selector, picture.mobile)}}`
    })
    .join('')
}
