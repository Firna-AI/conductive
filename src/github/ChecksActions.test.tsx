import { expect, it } from 'vitest'
import { ChecksActions } from './BarButtons'
import type { BarInput } from './barView'
import type { GitHubFeed } from './githubStore'
import {
  branchFeed,
  buttonsIn,
  controlsOf,
  readyFeed,
  render,
  snapshotOf,
  textOf,
} from './testing'

/** The words and the buttons of the top of the phone Checks tab, in order. */
function phoneTop(
  github: GitHubFeed,
  input: Partial<Omit<BarInput, 'snapshot'>> = {},
): { text: string; buttons: string[] } {
  const html = render(<ChecksActions controls={controlsOf(github, input)} />)
  return { text: textOf(html), buttons: buttonsIn(html) }
}

it('names the branch and its base above the actions at the top of the phone Checks tab in each state without a pull request, also without an action, and not with a pull request', () => {
  const stacked = branchFeed('none', {
    branch: 'calummoore/lisbon-7k2q',
    baseBranch: 'calummoore/checkout-autocomplete',
  })

  expect({
    stacked: phoneTop(stacked),
    noCommits: phoneTop(branchFeed('no-commits')),
    suspended: phoneTop(branchFeed('none'), { readOnly: true }),
    pullRequest: phoneTop(readyFeed(snapshotOf('ready-to-merge'))),
  }).toEqual({
    stacked: {
      text: 'calummoore/lisbon-7k2q calummoore/checkout-autocomplete Create PR',
      buttons: ['Create PR'],
    },
    noCommits: { text: 'calummoore/checkout-autocomplete main', buttons: [] },
    suspended: { text: 'calummoore/checkout-autocomplete main', buttons: [] },
    pullRequest: {
      text: 'Squash and merge Open on GitHub',
      buttons: ['Squash and merge'],
    },
  })
})

it('keeps the line of a moved base first at the top of the phone Checks tab, above the branch and its new base', () => {
  const moved = {
    branch: 'calummoore/lisbon-7k2q',
    baseMoved: 'calummoore/checkout-autocomplete',
  }
  const line =
    'Now targets main, because the branch calummoore/checkout-autocomplete is no longer on GitHub.'

  expect({
    noCommits: phoneTop(branchFeed('no-commits', moved)),
    createPr: phoneTop(branchFeed('none', moved)),
  }).toEqual({
    noCommits: { text: `${line} calummoore/lisbon-7k2q main`, buttons: [] },
    createPr: {
      text: `${line} calummoore/lisbon-7k2q main Create PR`,
      buttons: ['Create PR'],
    },
  })
})
