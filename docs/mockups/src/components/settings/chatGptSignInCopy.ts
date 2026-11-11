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
 * in the Connect form, and the row of a sign-in that stopped working. This
 * module imports no fixture, so the app and the Worker can import the same
 * words. The sign-in has no secret field, so it has no hint that the app
 * tests it.
 */
export const chatGptSignInCopy = {
  intro:
    'Sign in to ChatGPT, and Codex runs on your plan. First turn on device code sign-in in your ChatGPT security settings, or ask your ChatGPT admin.',
  /**
   * The link after each line that names the setting, to the security
   * settings of ChatGPT. The app and the mockups read the address only
   * from here. Two public guides in `src/marketing/docs/` repeat it as
   * Markdown links.
   */
  settingsLink: {
    label: 'Open ChatGPT settings',
    href: 'https://chatgpt.com/settings/security',
  },
  /** The button that asks for a code, until a code showed. */
  getCode: 'Get a code',
  /** The steps after the start, before and after the link to OpenAI. */
  steps: {
    before: 'Open',
    after: ', sign in to ChatGPT, and enter this code.',
  },
  keep: `Never share this code, and enter only a code that this page shows. It expires in ${codeMinutes} minutes.`,
  waiting: 'Waiting for you to sign in',
  expired: 'The code expired.',
  /** The button that asks for a code, once a code showed. */
  newCode: 'Get a new code',
  /** The state of a login that the app can no longer use. */
  signedOut: 'Signed out',
  signInAgain: 'Sign in again',
  /**
   * The causes that the Worker gives: OpenAI refused the sign-in because
   * device code sign-in is off, the Codex login changed while the sign-in
   * ran, or OpenAI did not renew a sign-in, which the field `unusableCause`
   * of the login status carries.
   */
  causes: {
    refused:
      'ChatGPT refused the sign-in, because device code sign-in is off. Turn it on in your ChatGPT security settings, or ask your ChatGPT admin.',
    loginChanged: 'Your Codex login changed. Get a new code.',
    notRenewed: 'ChatGPT access expired.',
    failed: 'ChatGPT sign-in failed.',
  },
} as const
