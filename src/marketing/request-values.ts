import {
  SITE_MARKERS,
  SITE_START_LABELS,
  type SiteRequestValues,
} from '../shared/site-build'
import type { SitePage } from './legal-text'
import { sitePaths } from './links'

/**
 * The values that only a request gives. A built page holds the marker of
 * each value, and the Worker fills it in. The Astro development server
 * shows local values instead: the app of `npm run dev`, the current year,
 * its own origin, and no Continue address.
 */
export const requestValues: SiteRequestValues = import.meta.env.DEV
  ? {
      appOrigin: 'http://127.0.0.1:5173',
      year: String(new Date().getFullYear()),
      siteOrigin: 'http://localhost:4321',
      continueAddress: '#',
      startLabel: SITE_START_LABELS.waitlist,
    }
  : SITE_MARKERS

/** Where each sign-in link leads: the app, which signs a visitor in with GitHub. */
export const signInHref = `${requestValues.appOrigin}/`

/** The section of the home page that lists the features. */
export const featuresHref = `${sitePaths.home}#features`

/**
 * Each page of the site as a complete address on the site origin, for the
 * agreement page, which the app host serves.
 */
export const siteOriginHrefs: Readonly<Record<SitePage, string>> = {
  home: `${requestValues.siteOrigin}${sitePaths.home}`,
  terms: `${requestValues.siteOrigin}${sitePaths.terms}`,
  privacy: `${requestValues.siteOrigin}${sitePaths.privacy}`,
  fromConductor: `${requestValues.siteOrigin}${sitePaths.fromConductor}`,
}
