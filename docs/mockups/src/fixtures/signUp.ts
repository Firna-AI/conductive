/**
 * Sign-up needs a GitHub account that is at least 30 days old and has a
 * verified email, as the user decided on 5 November 2026. The refusals
 * show this account, which is too new.
 */

export const minimumAccountAge = 30

export const refusedAccount = {
  login: 'jade-ng',
  created: '22 October',
  /** The day when the account is 30 days old. */
  canSignUp: '21 November',
} as const

/** GitHub's settings page where a person verifies an email address. */
export const githubEmailSettings = 'https://github.com/settings/emails'
