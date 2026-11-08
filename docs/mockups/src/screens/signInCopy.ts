import { productName } from '../brand'

/**
 * The words of the GitHub sign-in. The sign-in screen of the app, the page
 * that the Worker shows before GitHub, and their mockups share them.
 */
export const signInCopy = {
  title: `Sign in to ${productName}`,
  text: 'Use your GitHub account. If you are new, this also creates your account.',
  action: 'Continue with GitHub',
  home: 'Back to the home page',
} as const
