/**
 * The GitHub state of the open workspace branch: its pull request and the
 * checks that GitHub reports for it.
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

export type CheckState = 'passed' | 'failed' | 'running'

export type Check = {
  name: string
  state: CheckState
  /** How long a finished check ran. */
  duration?: string
}

function passed(name: string, duration: string): Check {
  return { name, state: 'passed', duration }
}

const allPassed: readonly Check[] = [
  passed('build', '1m 12s'),
  passed('lint', '24s'),
  passed('typecheck', '41s'),
  passed('unit', '1m 03s'),
  passed('e2e (chromium)', '3m 38s'),
  passed('e2e (webkit)', '3m 52s'),
]

/** The checks of the pull request in each banner state, in GitHub's order. */
export const checksByState: Readonly<Record<BannerState, readonly Check[]>> = {
  none: [],
  'checks-running': [
    ...allPassed.slice(0, 4),
    { name: 'e2e (chromium)', state: 'running' },
    { name: 'e2e (webkit)', state: 'running' },
  ],
  'checks-failed': [
    passed('build', '1m 12s'),
    { name: 'lint', state: 'failed', duration: '22s' },
    passed('typecheck', '41s'),
    passed('unit', '1m 03s'),
    { name: 'e2e (chromium)', state: 'failed', duration: '3m 40s' },
    passed('e2e (webkit)', '3m 52s'),
  ],
  'ready-to-merge': allPassed,
  merged: allPassed,
}

/** The review state that GitHub reports, when the pull request has one. */
export const reviewByState: Readonly<Record<BannerState, string | undefined>> =
  {
    none: undefined,
    'checks-running': undefined,
    'checks-failed': undefined,
    'ready-to-merge': 'Approved',
    merged: 'Approved',
  }

export const mergedInto = { branch: 'main', when: '2h ago' }
