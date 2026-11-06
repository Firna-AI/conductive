/** The paths of the pages of the site, on the root domain of the product. */
export const sitePaths = {
  home: '/',
  terms: '/terms',
  privacy: '/privacy',
} as const

/** The page of Boat where a visitor makes an account, as decision 47 allows. */
export const boatSignUpUrl = 'https://boat.dev'

/** Boat's terms, which apply to the Boat account of each org. */
export const boatTermsUrl = 'https://boat.dev/terms'

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
