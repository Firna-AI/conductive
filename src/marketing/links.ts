/** The paths of the pages of the site, on the root domain of the product. */
export const sitePaths = {
  home: '/',
  terms: '/terms',
  privacy: '/privacy',
} as const

/**
 * The address of each page of the site: a path on the site itself, or a
 * complete address on `origin`, for a page of another host.
 */
export function pageHrefs(
  origin?: string,
): Readonly<Record<keyof typeof sitePaths, string>> {
  const href = (path: string) => (origin ? new URL(path, origin).href : path)
  return {
    home: href(sitePaths.home),
    terms: href(sitePaths.terms),
    privacy: href(sitePaths.privacy),
  }
}

/** Where the actions of the site lead. */
export type SiteLinks = {
  /** The app, which signs a visitor in with GitHub. */
  signIn: string
  /** The section of the home page that lists the features. */
  features: string
}

/** The links of the site, for the origin of the app. */
export function siteLinks(appOrigin: string): SiteLinks {
  return {
    signIn: new URL('/', appOrigin).href,
    features: `${sitePaths.home}#features`,
  }
}
