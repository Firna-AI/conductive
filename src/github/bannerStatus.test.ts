import { expect, it } from 'vitest'
import type { BannerState, GitHubCheck } from '../shared/github'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { bannerDetail, bannerStatus } from './bannerStatus'
import { pullRequestBanner, snapshotOf } from './testing'

/** The times of the mockups: merged 2h ago, and closed 1d ago. */
const mergedAt = FAKE_TIME - 2 * 3_600_000
const closedAt = FAKE_TIME - 24 * 3_600_000

function statusOf(state: BannerState) {
  const banner = { ...pullRequestBanner(state), mergedAt, closedAt }
  const { checks } = snapshotOf(state).checks
  const { busy, icon, text, tone } = bannerStatus(banner, checks)
  const detail = bannerDetail(banner, checks, FAKE_TIME)
  // The icon by its name, so that each state shows the icon of the mockups.
  const mark = busy ? 'spinner' : (icon?.displayName ?? 'none')
  return { state, text, detail, tone, mark }
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

it('names each pull request state in words, with an icon and the tint of the mockups', () => {
  const states = [
    'checks-running',
    'checks-failed',
    'ready-to-merge',
    'merged',
    'conflict',
    'changes-requested',
    'draft',
    'closed',
    'blocked',
  ] as const

  expect(states.map(statusOf)).toEqual([
    {
      state: 'checks-running',
      text: 'Checks running',
      detail: '4 of 6',
      tone: 'neutral',
      mark: 'spinner',
    },
    {
      state: 'checks-failed',
      text: '2 checks failed',
      detail: null,
      tone: 'danger',
      mark: 'CircleX',
    },
    {
      state: 'ready-to-merge',
      text: 'Ready to merge',
      detail: 'Approved',
      tone: 'success',
      mark: 'CircleCheck',
    },
    {
      state: 'merged',
      text: 'Merged into main',
      detail: '2h ago',
      tone: 'neutral',
      mark: 'GitMerge',
    },
    {
      state: 'conflict',
      text: 'Merge conflict',
      detail: 'with main',
      tone: 'warning',
      mark: 'GitMergeConflict',
    },
    {
      state: 'changes-requested',
      text: 'Changes requested',
      detail: 'by @priyaraman',
      tone: 'warning',
      mark: 'MessageSquareWarning',
    },
    {
      state: 'draft',
      text: 'Draft',
      detail: null,
      tone: 'neutral',
      mark: 'GitPullRequestDraft',
    },
    {
      state: 'closed',
      text: 'Closed without a merge',
      detail: '1d ago',
      tone: 'neutral',
      mark: 'GitPullRequestClosed',
    },
    {
      state: 'blocked',
      text: 'Blocked',
      detail: null,
      tone: 'warning',
      mark: 'Ban',
    },
  ])
})

it('fits the counts, the reviewers, and the review to the data', () => {
  const running = pullRequestBanner('checks-running')
  const failed = pullRequestBanner('checks-failed')
  const changes = pullRequestBanner('changes-requested')
  const ready = pullRequestBanner('ready-to-merge')
  const reviewers = ['priyaraman', 'jonasweber', 'mira-k']
  const now = FAKE_TIME

  expect([
    bannerDetail(running, [check('queued'), check('passed')], now),
    bannerDetail(running, [], now),
    bannerStatus(failed, [check('failed'), check('passed')]).text,
    bannerStatus(failed, [
      check('failed'),
      check('timed-out'),
      check('cancelled'),
    ]).text,
    bannerStatus(failed, []).text,
    bannerDetail(
      { ...changes, changesRequestedBy: reviewers.slice(0, 2) },
      [],
      now,
    ),
    bannerDetail({ ...changes, changesRequestedBy: reviewers }, [], now),
    bannerDetail({ ...changes, changesRequestedBy: [] }, [], now),
    bannerDetail({ ...ready, review: 'pending' }, [], now),
    bannerDetail({ ...ready, review: null }, [], now),
  ]).toEqual([
    '1 of 2',
    null,
    '1 check failed',
    '2 checks failed',
    'Checks failed',
    'by @priyaraman and @jonasweber',
    'by @priyaraman and 2 others',
    null,
    'Pending',
    null,
  ])
})
