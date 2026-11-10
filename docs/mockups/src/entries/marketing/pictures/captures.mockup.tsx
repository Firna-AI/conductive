import { defineScreen } from '@mokly/mokly'
import { capturePagePath } from '../../../screens/marketingPictureCaptures'
import {
  marketingPictures,
  type MarketingPictureKey,
} from '../../../screens/marketingPictureList'
import { PictureCapture } from '../../../screens/marketingPictures'

/**
 * The capture page of one picture of the home page. Each page declares the
 * path that the shared list gives, so the capture command finds it there.
 */
function capturePage(key: MarketingPictureKey) {
  const { desktop, mobile } = marketingPictures[key]
  const shared = marketingPictures[key].files === 'shared'
  return defineScreen({
    path: capturePagePath(key),
    title: `${key.charAt(0).toUpperCase()}${key.slice(1)} picture`,
    description: `The part of the screen that the ${key} picture of the home page shows, at its own size and without a frame. Desktop: ${desktop.label}. Phone: ${mobile.label}.`,
    rationale: `The capture command opens this page at the size of its screen, and saves the part at the top left corner as the file of the picture, so it reads no markup of the screens. The list in marketingPictureList.ts gives the screen, the part, the scale, and the label of each layout, and the home page and the site read the same list.${shared ? ' Both layouts show the same part of the same screen, so the command saves one file from the mobile view.' : ''}`,
    relatedDocs: [],
    tags: ['picture-capture'],
    props: {},
    render: (_props, context) => (
      <PictureCapture layout={context.viewport} pictureKey={key} />
    ),
  })
}

const pages = {
  hero: capturePage('hero'),
  starting: capturePage('starting'),
  agents: capturePage('agents'),
  review: capturePage('review'),
  tools: capturePage('tools'),
  org: capturePage('org'),
  phone: capturePage('phone'),
  mac: capturePage('mac'),
} satisfies Record<MarketingPictureKey, unknown>

export const heroCapture = pages.hero
export const startingCapture = pages.starting
export const agentsCapture = pages.agents
export const reviewCapture = pages.review
export const toolsCapture = pages.tools
export const orgCapture = pages.org
export const phoneCapture = pages.phone
export const macCapture = pages.mac
