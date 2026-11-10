import {
  marketingPictureKeys,
  marketingPictures,
  type MarketingPictureKey,
  type PictureFrame,
  type PictureLayout,
} from '../../docs/mockups/src/screens/marketingPictureList'

/** The phone layout of the site. The stylesheets use the same width. */
export const phoneMedia = '(max-width: 759.98px)'

/** A visitor who prefers the light colour scheme. */
export const lightMedia = '(prefers-color-scheme: light)'

/** The classes of each frame of a picture. */
export const frameClasses: Readonly<Record<PictureFrame, string>> = {
  excerpt: 'frame-excerpt',
  phone: 'frame-phone',
  'window-or-phone': 'frame-window frame-mobile-phone',
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
