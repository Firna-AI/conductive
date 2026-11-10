import { expect, it } from 'vitest'

import {
  githubSummary,
  type BannerState,
  type GitHubBanner,
  type GitHubCheck,
  type GitHubSummary,
} from './github'

function banner(state: BannerState): GitHubBanner {
  const common = { branch: 'changes', baseBranch: 'main', updatedAt: 1 }
  if (state === 'none' || state === 'no-commits')
    return { ...common, state, pullRequest: null, createPullRequestUrl: null }
  return {
    ...common,
    state,
    pullRequest: {
      number: 1,
      title: 'Changes',
      url: 'https://github.com/a/b/pull/1',
    },
    review: null,
    changesRequestedBy: [],
    mergedAt: state === 'merged' ? 1 : null,
    closedAt: state === 'closed' ? 1 : null,
  }
}

function check(state: GitHubCheck['state']): GitHubCheck {
  return {
    id: state,
    name: state,
    state,
    url: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  }
}

const cases: readonly {
  scenario: string
  state: BannerState
  checks: readonly GitHubCheck['state'][]
  expected: GitHubSummary | null
}[] = [
  {
    scenario: 'failure wins over running',
    state: 'checks-running',
    checks: ['running', 'failed'],
    expected: 'checks-failed',
  },
  {
    scenario: 'cancelled fails',
    state: 'ready-to-merge',
    checks: ['cancelled'],
    expected: 'checks-failed',
  },
  {
    scenario: 'timed-out fails',
    state: 'ready-to-merge',
    checks: ['timed-out'],
    expected: 'checks-failed',
  },
  {
    scenario: 'action-required fails',
    state: 'ready-to-merge',
    checks: ['action-required'],
    expected: 'checks-failed',
  },
  {
    scenario: 'queued runs',
    state: 'ready-to-merge',
    checks: ['queued', 'passed'],
    expected: 'checks-running',
  },
  {
    scenario: 'running runs',
    state: 'ready-to-merge',
    checks: ['running'],
    expected: 'checks-running',
  },
  {
    scenario: 'skipped and neutral pass',
    state: 'ready-to-merge',
    checks: ['skipped', 'neutral', 'passed'],
    expected: 'checks-passed',
  },
  {
    scenario: 'merge wins over failed and running',
    state: 'merged',
    checks: ['failed', 'running'],
    expected: 'merged',
  },
  {
    scenario: 'closed has no summary',
    state: 'closed',
    checks: ['failed'],
    expected: null,
  },
  {
    scenario: 'no pull request has no summary',
    state: 'none',
    checks: ['passed'],
    expected: null,
  },
  {
    scenario: 'no commits has no summary',
    state: 'no-commits',
    checks: [],
    expected: null,
  },
  {
    scenario: 'no checks has no summary',
    state: 'ready-to-merge',
    checks: [],
    expected: null,
  },
  ...(['draft', 'conflict', 'changes-requested', 'blocked'] as const).map(
    (state) => ({
      scenario: `${state} keeps the check summary`,
      state,
      checks: ['passed'] as const,
      expected: 'checks-passed' as const,
    }),
  ),
]

it.each(cases)('summarizes $scenario', ({ state, checks, expected }) => {
  expect(githubSummary(banner(state), checks.map(check))).toBe(expected)
})
