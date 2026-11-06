import { expect, it } from 'vitest'
import type { GitHubCheck } from '../shared/github'
import type { PullRequestBanner } from './bannerStatus'
import { ChecksList } from './ChecksList'
import type { GitHubFeed } from './githubStore'
import {
  branchFeed,
  itemsIn,
  pullRequestBanner,
  readyFeed,
  render,
  textOf,
} from './testing'

function check(
  name: string,
  state: GitHubCheck['state'],
  durationMs: number | null,
): GitHubCheck {
  return {
    id: name,
    name,
    state,
    url: null,
    startedAt: null,
    completedAt: null,
    durationMs,
  }
}

function checksFeed(
  checks: readonly GitHubCheck[],
  review: PullRequestBanner['review'] = 'approved',
): GitHubFeed {
  return readyFeed({
    banner: { ...pullRequestBanner('checks-failed'), review },
    checks: { state: 'available', checks },
  })
}

it("lists the checks in GitHub's order, with the duration of each finished check", () => {
  const github = checksFeed([
    check('e2e (webkit)', 'running', null),
    check('build', 'passed', 72_000),
    check('lint', 'failed', 22_000),
    check('deploy', 'queued', null),
    check('audit', 'timed-out', 3_725_000),
    check('docs', 'skipped', null),
    check('canary', 'cancelled', 5_000),
    check('size', 'neutral', 1_000),
    check('approval', 'action-required', 2_000),
  ])

  expect(itemsIn(render(<ChecksList github={github} />))).toEqual([
    'e2e (webkit) Running',
    'build Passed 1m 12s',
    'lint Failed 22s',
    'deploy Queued',
    'audit Timed out 1h 02m',
    'docs Skipped',
    'canary Cancelled 5s',
    'size Neutral 1s',
    'approval Action required 2s',
  ])
})

it('sums up the failed checks and the review under the pull request title', () => {
  const feeds = [
    checksFeed(
      [
        check('build', 'passed', 72_000),
        check('lint', 'failed', 22_000),
        check('audit', 'timed-out', 60_000),
      ],
      'changes-requested',
    ),
    checksFeed([check('build', 'passed', 72_000)], 'approved'),
    checksFeed([], null),
  ]

  expect(
    feeds.map((github) => textOf(render(<ChecksList github={github} />))),
  ).toEqual([
    'Add address autocomplete to checkout 2 of 3 failed · Changes requested build Passed 1m 12s lint Failed 22s audit Timed out 1m 00s',
    'Add address autocomplete to checkout 1 check · Approved build Passed 1m 12s',
    'Add address autocomplete to checkout No checks',
  ])
})

it('waits for a pull request while the branch has none', () => {
  const html = render(<ChecksList github={branchFeed('none', null)} />)

  expect({ text: textOf(html), items: itemsIn(html) }).toEqual({
    text: 'GitHub checks show here They appear when the branch has a pull request.',
    items: [],
  })
})
