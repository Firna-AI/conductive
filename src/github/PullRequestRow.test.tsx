import { expect, it } from 'vitest'
import type { GitHubFeed } from './githubStore'
import { PullRequestRow } from './PullRequestRow'
import {
  branchFeed,
  linksIn,
  readyFeed,
  render,
  snapshotOf,
  textOf,
} from './testing'

const checksHref = '/acme/checkout-autocomplete/checks'
const compareUrl =
  'https://github.com/acme/storefront/compare/main...calummoore:checkout-autocomplete?expand=1'

function renderRow(github: GitHubFeed): string {
  return render(<PullRequestRow checksHref={checksHref} github={github} />)
}

it('opens the checks from a pull request, and GitHub from a branch without one', () => {
  const rows = [
    renderRow(readyFeed(snapshotOf('ready-to-merge'))),
    renderRow(branchFeed('none', compareUrl)),
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
      text: 'Create pull request',
      links: [{ text: 'Create pull request', href: compareUrl }],
    },
    { text: 'No commits yet', links: [] },
  ])
})
