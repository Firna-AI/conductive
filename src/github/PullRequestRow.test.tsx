import { expect, it } from 'vitest'
import type { BarInput } from './barView'
import type { GitHubFeed } from './githubStore'
import { PullRequestRow } from './PullRequestRow'
import {
  branchFeed,
  controlsOf,
  linksIn,
  readyFeed,
  render,
  snapshotOf,
  textOf,
} from './testing'

const checksHref = '/acme/checkout-autocomplete/checks'
const compareUrl =
  'https://github.com/acme/storefront/compare/main...calummoore:checkout-autocomplete?expand=1'

function renderRow(
  github: GitHubFeed,
  input: Partial<Omit<BarInput, 'snapshot'>> = {},
): string {
  return render(
    <PullRequestRow
      checksHref={checksHref}
      controls={controlsOf(github, input)}
      github={github}
    />,
  )
}

it('opens the checks from a pull request, and from a branch without one when the bar has an action or a link', () => {
  const rows = [
    renderRow(readyFeed(snapshotOf('ready-to-merge'))),
    renderRow(readyFeed(snapshotOf('blocked'))),
    renderRow(branchFeed('none', compareUrl)),
    renderRow(branchFeed('no-commits', null), { localWork: 'yes' }),
    renderRow(branchFeed('no-commits', null)),
  ]

  expect(
    rows.map((html) => ({ text: textOf(html), links: linksIn(html) })),
  ).toEqual([
    {
      text: '#482 Ready to merge Show the checks',
      links: [
        { text: '#482 Ready to merge Show the checks', href: checksHref },
      ],
    },
    {
      text: '#482 Blocked Show the checks',
      links: [{ text: '#482 Blocked Show the checks', href: checksHref }],
    },
    {
      text: 'Create pull request',
      links: [{ text: 'Create pull request', href: checksHref }],
    },
    {
      text: 'Create pull request',
      links: [{ text: 'Create pull request', href: checksHref }],
    },
    { text: 'No commits yet', links: [] },
  ])
})
