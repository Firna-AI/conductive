/**
 * The names that the build of the marketing site and the Worker share.
 * Astro builds the site into one folder of the static assets of the
 * Worker, with a list of its files. A built page holds a marker in place
 * of each value that only a request gives, and the Worker fills it in.
 *
 * This module has no imports. The Worker, the site, the build in Node, and
 * the NodeNext build of the Mac app can all import it.
 */

/** The folder of the built site, inside the static assets of the Worker. */
export const SITE_FOLDER = '_site'

/** The name of the file list of the build, at the top of the site folder. */
export const SITE_FILE_LIST = 'site-files.json'

/**
 * The folder of the pages that only the app host serves, inside the site
 * folder. The root domain serves no file of it.
 */
export const APP_HOST_PAGES = 'app-host'

/** The agreement page before GitHub, as a path inside the site folder. */
export const TERMS_CONSENT_PAGE = `${APP_HOST_PAGES}/terms-consent.html`

/**
 * The fixed addresses of the brand icons. The build copies them from the
 * brand folder unchanged. A browser asks for `/favicon.ico` when a page
 * names no icon, so the Worker serves `faviconIco` there too.
 */
export const SITE_ICONS = {
  faviconIco: `/${SITE_FOLDER}/favicon.ico`,
  faviconSvg: `/${SITE_FOLDER}/favicon.svg`,
  appleTouchIcon: `/${SITE_FOLDER}/apple-touch-icon.png`,
} as const

/**
 * The marker of each value that only a request gives. The Worker replaces
 * each marker of a built page with the value as escaped text. No marker
 * contains another one, so the order of the replacements does not matter.
 */
export const SITE_MARKERS = {
  /** The origin of the app, where each sign-in link leads. */
  appOrigin: '__CONDUCTIVE_SITE_APP_ORIGIN__',
  /** The year of the copyright line in the footer. */
  year: '__CONDUCTIVE_SITE_YEAR__',
  /** The origin of the site, for the links of the agreement page. */
  siteOrigin: '__CONDUCTIVE_SITE_ORIGIN__',
  /** The address of Continue with GitHub on the agreement page. */
  continueAddress: '__CONDUCTIVE_SITE_CONTINUE_ADDRESS__',
} as const

/** A value for each marker, such as the values of one request. */
export type SiteRequestValues = Readonly<
  Record<keyof typeof SITE_MARKERS, string>
>

/** One file of the built site. */
export type SiteFile = {
  /** The path of the file inside the site folder, such as `terms.html`. */
  readonly path: string
  /**
   * Only for a page: the SHA-256 hash, in Base64, of the content of each
   * style element of the page, in the order of the page.
   */
  readonly styleHashes?: readonly string[]
}

/** The file list that the build writes as `SITE_FILE_LIST`. */
export type SiteFileList = {
  /** Every built file except the list itself, sorted by path. */
  readonly files: readonly SiteFile[]
}
