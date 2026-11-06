import type {
  BannerState,
  GitHubBannerResponse,
  GitHubCheck,
  GitHubChecksResponse,
} from '../../shared/github'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'

/**
 * The samples of the development page. `fake` is the data of the fake API.
 * The others change it to valid contract data that the fake does not send.
 */
export const samples = [
  'fake',
  'every-check',
  'no-checks',
  'no-create-link',
  'long-base',
] as const

export type Sample = (typeof samples)[number]

export interface SampleReplies {
  banner: GitHubBannerResponse
  checks: GitHubChecksResponse
}

const longBase =
  'release/customer-payments-checkout-autocomplete-accessibility-rollout-2026-november'
const actionsUrl = 'https://github.com/acme/storefront/actions'

function check(
  name: string,
  state: GitHubCheck['state'],
  durationMs: number | null,
): GitHubCheck {
  const started = state === 'queued' ? null : FAKE_TIME - (durationMs ?? 0)
  const finished = state !== 'queued' && state !== 'running'
  return {
    id: `sample-${name}`,
    name,
    state,
    url: actionsUrl,
    startedAt: started,
    completedAt: finished ? FAKE_TIME : null,
    durationMs: finished ? durationMs : null,
  }
}

/** One check in each of the nine states of the contract. */
const everyCheck: readonly GitHubCheck[] = [
  check('build', 'passed', 72_000),
  check('lint', 'failed', 22_000),
  check('typecheck', 'timed-out', 3_600_000),
  check('unit', 'running', 41_000),
  check('e2e (chromium)', 'queued', null),
  check('e2e (webkit)', 'cancelled', 5_000),
  check('deploy preview', 'skipped', null),
  check('bundle size', 'neutral', 41_000),
  check('security review', 'action-required', 3_000),
]

/** The banner and checks replies of a state, as a sample changes them. */
export function sampleReplies(
  sample: Sample,
  state: BannerState,
): SampleReplies {
  const { banner, checks } = toolFixtures(state)
  const available = checks.state === 'available'
  switch (sample) {
    case 'fake':
      return { banner, checks }
    case 'every-check':
      return {
        banner,
        checks: available ? { state: 'available', checks: everyCheck } : checks,
      }
    case 'no-checks':
      return {
        banner,
        checks: available ? { state: 'available', checks: [] } : checks,
      }
    case 'no-create-link': {
      const branch = banner.banner
      if (branch.pullRequest !== null) return { banner, checks }
      return {
        banner: { banner: { ...branch, createPullRequestUrl: null } },
        checks,
      }
    }
    case 'long-base':
      return {
        banner: { banner: { ...banner.banner, baseBranch: longBase } },
        checks,
      }
  }
}
