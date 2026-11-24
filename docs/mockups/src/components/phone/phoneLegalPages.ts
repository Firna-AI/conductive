import { phonePaths } from '../../phonePaths'
import type { LegalPages } from '../marketing/LegalLinks'

/**
 * The pages that the legal links of a phone app open: Terms and Privacy on
 * the app host, in the in-app browser. They show the shared legal text with
 * no header or footer of the site, so no link leads to the home page or the
 * pricing page.
 */
export const phoneLegalPages = {
  terms: phonePaths.browserTerms,
  privacy: phonePaths.browserPrivacy,
} as const satisfies LegalPages

/**
 * The stage of the phone sign-in that Done of the legal pages shows, and
 * its catalogue page. Only that stage links the legal pages. The other
 * stages show the same links with no destination, because the catalogue
 * draws no Done that returns to them.
 */
export const phoneLegalReturn = {
  stage: 'start',
  path: phonePaths.signIn,
} as const
