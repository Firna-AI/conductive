import { expect, it } from 'vitest'
import { FAKE_TIME } from '../test-support/fixtures/core'
import type { BarInput } from './barView'
import type { GitHubFeed } from './githubStore'
import { PullRequestBar } from './PullRequestBar'
import {
  branchFeed,
  buttonsIn,
  controlsOf,
  linksIn,
  readyFeed,
  render,
  snapshotOf,
  textOf,
} from './testing'

const compareUrl =
  'https://github.com/acme/storefront/compare/main...calummoore:checkout-autocomplete?expand=1'
const pullUrl = 'https://github.com/acme/storefront/pull/482'

function renderBar(
  github: GitHubFeed,
  input: Partial<Omit<BarInput, 'snapshot'>> = {},
): string {
  return render(
    <PullRequestBar
      controls={controlsOf(github, input)}
      github={github}
      now={FAKE_TIME}
    />,
  )
}

it('offers Create pull request for a branch with commits or local work, and Create on GitHub only beside a create URL', () => {
  const bars = [
    renderBar(branchFeed('none', compareUrl)),
    renderBar(branchFeed('none', null)),
    renderBar(branchFeed('no-commits', null)),
    renderBar(branchFeed('no-commits', null), { localWork: 'yes' }),
  ]

  expect(
    bars.map((html) => ({
      text: textOf(html),
      links: linksIn(html),
      buttons: buttonsIn(html),
    })),
  ).toEqual([
    {
      text: 'calummoore/checkout-autocomplete main Create pull request Create on GitHub',
      links: [{ text: 'Create on GitHub', href: compareUrl }],
      buttons: ['Create pull request'],
    },
    {
      text: 'calummoore/checkout-autocomplete main Create pull request',
      links: [],
      buttons: ['Create pull request'],
    },
    {
      text: 'calummoore/checkout-autocomplete main No commits yet',
      links: [],
      buttons: [],
    },
    {
      text: 'calummoore/checkout-autocomplete main Create pull request',
      links: [],
      buttons: ['Create pull request'],
    },
  ])
})

it('keeps Open on GitHub in each pull request state, beside the main action of a member with write access', () => {
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
  const github = [{ text: 'Open on GitHub', href: pullUrl }]

  expect(
    states.map((state) => {
      const html = renderBar(readyFeed(snapshotOf(state)))
      return { state, links: linksIn(html), buttons: buttonsIn(html) }
    }),
  ).toEqual([
    { state: 'checks-running', links: github, buttons: [] },
    { state: 'checks-failed', links: github, buttons: ['Fix checks'] },
    { state: 'ready-to-merge', links: github, buttons: ['Squash and merge'] },
    { state: 'merged', links: github, buttons: ['Continue', 'Archive'] },
    { state: 'conflict', links: github, buttons: ['Resolve conflicts'] },
    {
      state: 'changes-requested',
      links: github,
      buttons: ['Address review'],
    },
    { state: 'draft', links: github, buttons: [] },
    { state: 'closed', links: github, buttons: [] },
    { state: 'blocked', links: github, buttons: [] },
  ])
})

it('shows Merging on the running merge, and a refusal as one alert line under the bar with Open on GitHub', () => {
  const ready = readyFeed(snapshotOf('ready-to-merge'))
  const merging = renderBar(ready, { outcome: { kind: 'merging' } })
  const refused = renderBar(ready, {
    outcome: { kind: 'merge-refused', reason: 'merge-refused' },
  })
  const waits = renderBar(readyFeed(snapshotOf('merged')), { turnRuns: true })

  expect({
    merging: buttonsIn(merging),
    refused: {
      alert: /role="alert"[^>]*>[\s\S]*GitHub refused the merge\./.test(
        refused,
      ),
      links: linksIn(refused),
    },
    waits: {
      status: /role="status"/.test(waits),
      text: textOf(waits).includes('Continue waits for the agent to finish.'),
    },
  }).toEqual({
    merging: ['Merging'],
    refused: {
      alert: true,
      links: [
        { text: 'Open on GitHub', href: pullUrl },
        { text: 'Open on GitHub', href: pullUrl },
      ],
    },
    waits: { status: true, text: true },
  })
})
