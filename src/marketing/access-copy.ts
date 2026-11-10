/**
 * The words of the two actions of the site. The site and its mockups show
 * the same words. Sign up is the main action of each page: it starts the
 * GitHub sign-in, which also creates the account of a new person. Download
 * for Mac leads to the Mac app section of the home page, which offers the
 * DMG of each chip, because a page runs no script to pick the chip of the
 * visitor.
 */
export const siteActionCopy = {
  signUp: 'Sign up',
  download: 'Download for Mac',
} as const

/**
 * The sentence under the last call to action of a page of the site. A new
 * account waits for app access, which an approval, an invite code, or an
 * org invitation gives. The buttons do not name the waitlist, so this
 * sentence says that the app opens only when the account gets access. It
 * starts with the words of the main action. The site and its mockups show
 * the same words.
 */
export const waitlistText =
  'Sign up with GitHub. The app opens for you when your account gets access.'
