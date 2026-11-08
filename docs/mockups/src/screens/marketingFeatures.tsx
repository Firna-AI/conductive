import type { Viewport } from '@mokly/mokly'
import {
  Archive,
  Cloud,
  ListTree,
  PanelsTopLeft,
  SquarePlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  features as siteFeatures,
  smallerFeatures as siteSmallerFeatures,
  type FeatureItem as SiteFeatureItem,
} from '../../../../src/marketing/features'
import type { FeatureItem } from '../components/marketing/FeatureGrid'
import type { Feature } from '../components/marketing/FeatureSection'
import { marketingPicture } from './marketingPictures'

/** The lucide component of each icon that a smaller feature names. */
const icons: Readonly<Record<SiteFeatureItem['icon'], LucideIcon>> = {
  cloud: Cloud,
  users: Users,
  'list-tree': ListTree,
  'square-plus': SquarePlus,
  'panels-top-left': PanelsTopLeft,
  archive: Archive,
}

/**
 * The features of the home page, each with a real screen of the app. Their
 * words come from the site's `src/marketing/features.ts`, so the mockup and
 * the site show the same words.
 */
export function features(viewport: Viewport): Feature[] {
  return siteFeatures.map((feature) => ({
    key: feature.picture,
    label: feature.label,
    title: feature.title,
    text: feature.text,
    ...marketingPicture(feature.picture, viewport),
    bleed: feature.bleed,
  }))
}

/** The smaller features, in a grid under the large ones. */
export const smallerFeatures: readonly FeatureItem[] = siteSmallerFeatures.map(
  (item) => ({ icon: icons[item.icon], title: item.title, text: item.text }),
)
