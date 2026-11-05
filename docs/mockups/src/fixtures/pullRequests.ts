/**
 * The GitHub state of the open workspace branch, as the banner shows it.
 */

export const bannerStates = [
  'none',
  'checks-running',
  'checks-failed',
  'ready-to-merge',
  'merged',
] as const

export type BannerState = (typeof bannerStates)[number]

export type PullRequest = {
  number: number
  title: string
  url: string
}

export const pullRequest: PullRequest = {
  number: 482,
  title: 'Add address autocomplete to checkout',
  url: 'https://github.com/acme/storefront/pull/482',
}

export const newPullRequestUrl =
  'https://github.com/acme/storefront/compare/main...cal/checkout-autocomplete'

export type Checks = {
  total: number
  done: number
  failed: readonly string[]
}

export const checksByState: Readonly<Record<BannerState, Checks>> = {
  none: { total: 0, done: 0, failed: [] },
  'checks-running': { total: 6, done: 4, failed: [] },
  'checks-failed': { total: 6, done: 6, failed: ['e2e (chromium)', 'lint'] },
  'ready-to-merge': { total: 6, done: 6, failed: [] },
  merged: { total: 6, done: 6, failed: [] },
}

export const mergedInto = { branch: 'main', when: '2 hours ago' }
