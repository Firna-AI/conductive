import type { Viewport } from '@mokly/mokly'
import type { MarketingPictureKey } from '../marketingPictureList'
import { ScreenFrame } from '../../components/marketing/ScreenFrame'
import { marketingPicture } from '../marketingPictures'

/**
 * The parts that the variations of the home page share. Each variation
 * keeps the words of the current page from `src/marketing/features.ts`,
 * and the real screens of the catalogue as its pictures. Only the layout,
 * the type, and the colour change.
 */

/** The words of the sections under the features, as the home page has them. */
export const homeSections = {
  gridLabel: 'And more',
  gridTitle: 'Less to look after.',
  gridText: 'The app starts and stops the cloud computers for you.',
  closingTitle: 'Give your next task its own cloud computer.',
} as const

/**
 * The tints that a variation can give its features, in their order. Each
 * tint is a pair of design tokens, so it works in both colour schemes.
 */
export const featureTints = [
  { tint: 'var(--ui-primary)', soft: 'var(--ui-primary-soft)' },
  { tint: 'var(--ui-merged)', soft: 'var(--ui-merged-soft)' },
  { tint: 'var(--ui-success)', soft: 'var(--ui-success-soft)' },
  { tint: 'var(--ui-amber)', soft: 'var(--ui-amber-soft)' },
  { tint: 'var(--ui-rose)', soft: 'var(--ui-rose-soft)' },
  { tint: 'var(--ui-primary)', soft: 'var(--ui-primary-soft)' },
  { tint: 'var(--ui-merged)', soft: 'var(--ui-merged-soft)' },
] as const

/** The CSS variables of the tint at a place in the list of features. */
export function tintStyle(index: number) {
  const { tint, soft } = featureTints[index % featureTints.length]
  return { '--tint': tint, '--tint-soft': soft } as Record<string, string>
}

/** The number of a feature, as two digits, such as "01". */
export function featureNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/**
 * Whether a picture is wider than `room` px in a layout. A stage then lets
 * the picture run off one edge on purpose, so that it does not cut it on
 * both sides.
 */
export function pictureIsWide(
  key: MarketingPictureKey,
  viewport: Viewport,
  room: number,
): boolean {
  const { picture } = marketingPicture(key, viewport)
  const scale = picture.scale === 'inherit' ? 1 : picture.scale
  return picture.crop.width * scale > room
}

/** The real screen of a picture of the home page, in its frame. */
export function FeaturePicture(props: {
  picture: MarketingPictureKey
  viewport: Viewport
}) {
  const { picture, device } = marketingPicture(props.picture, props.viewport)
  return <ScreenFrame device={device} picture={picture} />
}
