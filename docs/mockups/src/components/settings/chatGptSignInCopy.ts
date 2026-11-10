/**
 * The steps of the ChatGPT sign-in of Codex: before the start, the code
 * while the page waits for the sign-in, the code expired, and the sign-in
 * refused.
 */
export const signInSteps = ['start', 'code', 'expired', 'refused'] as const

export type SignInStep = (typeof signInSteps)[number]

/** How long a code works: the time that the pinned Codex 0.167.0 waits. */
const codeMinutes = 15

/**
 * The words of the ChatGPT sign-in of Codex on the Account page: the steps
 * in the Connect form, the note under the share switch of a ChatGPT plan,
 * and the row of a sign-in that stopped working. This module imports no
 * fixture, so the app and the Worker can import the same words. The
 * sign-in has no secret field, so it has no hint that the app tests it.
 */
export const chatGptSignInCopy = {
  intro:
    'Sign in to ChatGPT, and Codex runs on your plan. First turn on device code sign-in in your ChatGPT security settings, or ask your ChatGPT admin.',
  getCode: 'Get a code',
  /** The steps after the start, before and after the link to OpenAI. */
  steps: {
    before: 'Open',
    after: ', sign in to ChatGPT, and enter this code.',
  },
  keep: `Never share this code, and enter only a code that this page shows. It expires in ${codeMinutes} minutes.`,
  waiting: 'Waiting for you to sign in',
  expired: 'The code expired.',
  newCode: 'Get a new code',
  /** The note under the share switch of a ChatGPT plan (decision 175). */
  shareNote: "Under OpenAI's terms, only you may use your ChatGPT plan.",
  /** The state of a login that the app can no longer use. */
  signedOut: 'Signed out',
  signInAgain: 'Sign in again',
  /**
   * The causes that the Worker gives: OpenAI refused the sign-in because
   * device code sign-in is off, or OpenAI did not renew a sign-in, which the
   * field `unusableCause` of the login status carries.
   */
  causes: {
    refused:
      'ChatGPT refused the sign-in, because device code sign-in is off. Turn it on in your ChatGPT security settings, or ask your ChatGPT admin.',
    notRenewed: 'ChatGPT access expired.',
  },
} as const
