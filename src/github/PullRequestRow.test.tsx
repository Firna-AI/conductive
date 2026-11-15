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

it('opens the checks from a pull request, and from a branch without one when the bar has an action', () => {
  const rows = [
    renderRow(readyFeed(snapshotOf('ready-to-merge'))),
    renderRow(readyFeed(snapshotOf('blocked'))),
    renderRow(branchFeed('none')),
    renderRow(branchFeed('none'), {
      capabilities: {
        status: 'ready',
        capabilities: { canWrite: false, mergeMethod: null },
      },
    }),
    renderRow(branchFeed('no-commits'), { localWork: 'changes' }),
    renderRow(branchFeed('no-commits')),
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
      text: 'Create PR',
      links: [{ text: 'Create PR', href: checksHref }],
    },
    { text: 'No pull request yet', links: [] },
    {
      text: 'Create PR',
      links: [{ text: 'Create PR', href: checksHref }],
    },
    { text: 'No commits yet', links: [] },
  ])
})
