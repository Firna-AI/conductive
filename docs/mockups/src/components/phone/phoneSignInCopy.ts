import { appDomain, productName } from '../../../../../src/shared/brand'
import type { SystemAlertWords } from './SystemAlert'

/**
 * The words of the sign-in of the phone apps that the sign-in of the app
 * does not have. The start uses the words of the sign-in of the app.
 * GitHub runs in the auth session of the system, over the app, and shows
 * the errors of its own step there. The words of a sign-in that ended hold
 * for each cause: the end of the 30 days, a new revision of the terms, and
 * a suspension. They name no session, because a session in the app is a
 * chat with an agent.
 */
export const phoneSignInCopy = {
  /** GitHub signed the person in, and the app finishes the sign-in. */
  waiting: {
    title: 'Signing in',
  },
  /** GitHub handed the sign-in back, and the app could not finish it. */
  failed: {
    title: "Sign-in didn't finish",
    body: 'Continue with GitHub to try again.',
  },
  /** The phone was signed out, so the sign-in shows again. */
  ended: {
    title: 'Sign in again',
    text: 'You were signed out on this device.',
  },
} as const

/**
 * The alert of iOS before the auth session opens. iOS writes these words,
 * with the name of the app and the host of the sign-in. Android shows no
 * alert.
 */
export const signInAlertCopy = {
  title: `“${productName}” Wants to Use “${appDomain}” to Sign In`,
  body: 'This allows the app and website to share information about you.',
  deny: 'Cancel',
  allow: 'Continue',
} as const satisfies SystemAlertWords
