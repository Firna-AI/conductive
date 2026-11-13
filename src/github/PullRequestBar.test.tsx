import { expect, it } from 'vitest'
import { FAKE_TIME } from '../test-support/fixtures/core'
import type { CommandKeyOf } from './barKeys'
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

it('offers Create PR for a branch with commits or local work, and no link to GitHub without a pull request', () => {
  const noWrite = {
    capabilities: {
      status: 'ready',
      capabilities: { canWrite: false, mergeMethod: null },
    },
  } satisfies Partial<BarInput>
  const bars = [
    renderBar(branchFeed('none')),
    renderBar(branchFeed('none'), noWrite),
    renderBar(branchFeed('no-commits')),
    renderBar(branchFeed('no-commits'), { localWork: 'changes' }),
  ]

  expect(
    bars.map((html) => ({
      text: textOf(html),
      links: linksIn(html),
      buttons: buttonsIn(html),
    })),
  ).toEqual([
    {
      text: 'calummoore/checkout-autocomplete main Create PR',
      links: [],
      buttons: ['Create PR'],
    },
    {
      text: 'calummoore/checkout-autocomplete main No pull request yet',
      links: [],
      buttons: [],
    },
    {
      text: 'calummoore/checkout-autocomplete main No commits yet',
      links: [],
      buttons: [],
    },
    {
      text: 'calummoore/checkout-autocomplete main Create PR',
      links: [],
      buttons: ['Create PR'],
    },
  ])
})

it('links the number of the pull request to GitHub in each state, in place of a separate link, beside the main action of a member with write access', () => {
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
  const github = [{ text: '#482', href: pullUrl }]

  expect(
    renderBar(readyFeed(snapshotOf('ready-to-merge'))).match(
      /aria-label="Open pull request #482 on GitHub"/g,
    ),
  ).toHaveLength(1)
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
        { text: '#482', href: pullUrl },
        { text: 'Open on GitHub', href: pullUrl },
      ],
    },
    waits: { status: true, text: true },
  })
})

it('names the key of the command of each button and of the number in its tooltip, only while the button takes a click', () => {
  // The app gives each key. Here each tooltip names its command instead.
  const keyOf: CommandKeyOf = (command, label) => ({
    title: `${label} (${command})`,
    aria: command,
  })
  const merged = readyFeed(snapshotOf('merged'))
  const tooltips = (input: Partial<Omit<BarInput, 'snapshot'>>) => {
    const html = render(
      <PullRequestBar
        controls={controlsOf(merged, input)}
        github={merged}
        keyOf={keyOf}
        now={FAKE_TIME}
      />,
    )
    const titles = [...html.matchAll(/title="([^"]*)"/g)].map(([, title]) =>
      textOf(title),
    )
    return titles.filter((title) => / \([a-z-]+\)$/.test(title))
  }
  const number = 'Open pull request #482 on GitHub (open-pull-request)'
  const continues = 'Continue (continue-after-merge)'
  const archive = 'Archive (archive-workspace)'

  expect({
    idle: tooltips({}),
    continuing: tooltips({ outcome: { kind: 'continuing' } }),
    waiting: tooltips({ turnRuns: true }),
    archiving: tooltips({ archiving: true }),
  }).toEqual({
    idle: [number, continues, archive],
    continuing: [number],
    waiting: [number, archive],
    archiving: [number, continues],
  })
})
