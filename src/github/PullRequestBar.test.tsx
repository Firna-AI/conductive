import { expect, it } from 'vitest'
import type { MessageSender } from '../shared/messages'
import type { WorkspaceState } from '../shared/workspaces'
import { FAKE_TIME } from '../test-support/fixtures/core'
import type { GitHubViewer } from './archive'
import type { GitHubFeed } from './githubStore'
import { PullRequestBar } from './PullRequestBar'
import {
  branchFeed,
  buttonsIn,
  linksIn,
  readyFeed,
  render,
  snapshotOf,
  textOf,
} from './testing'

const owner: MessageSender = {
  id: 'cal',
  githubLogin: 'calummoore',
  displayName: 'Cal',
  avatarUrl: null,
}
const ownerViewer: GitHubViewer = { id: 'cal', role: 'member' }
const compareUrl =
  'https://github.com/acme/storefront/compare/main...calummoore:checkout-autocomplete?expand=1'

function renderBar(
  github: GitHubFeed,
  viewer: GitHubViewer = ownerViewer,
  workspaceState: WorkspaceState = 'ready',
): string {
  return render(
    <PullRequestBar
      github={github}
      now={FAKE_TIME}
      onArchive={() => undefined}
      viewer={viewer}
      workspace={{ owner, state: workspaceState }}
    />,
  )
}

it('offers Create pull request only for a branch with commits and a create URL', () => {
  const withUrl = renderBar(branchFeed('none', compareUrl))
  const withoutUrl = renderBar(branchFeed('none', null))
  const noCommits = renderBar(branchFeed('no-commits', compareUrl))

  expect(
    [withUrl, withoutUrl, noCommits].map((html) => ({
      text: textOf(html),
      links: linksIn(html),
    })),
  ).toEqual([
    {
      text: 'calummoore/checkout-autocomplete main Create pull request',
      links: [{ text: 'Create pull request', href: compareUrl }],
    },
    {
      text: 'calummoore/checkout-autocomplete main No pull request yet',
      links: [],
    },
    {
      text: 'calummoore/checkout-autocomplete main No commits yet',
      links: [],
    },
  ])
})

it('links each pull request state to GitHub, with no button that acts on GitHub', () => {
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
  const github = [
    {
      text: 'Open on GitHub',
      href: 'https://github.com/acme/storefront/pull/482',
    },
  ]

  expect(
    states.map((state) => {
      const html = renderBar(readyFeed(snapshotOf(state)))
      return { state, links: linksIn(html), buttons: buttonsIn(html) }
    }),
  ).toEqual([
    { state: 'checks-running', links: github, buttons: [] },
    { state: 'checks-failed', links: github, buttons: [] },
    { state: 'ready-to-merge', links: github, buttons: [] },
    { state: 'merged', links: github, buttons: ['Archive'] },
    { state: 'conflict', links: github, buttons: [] },
    { state: 'changes-requested', links: github, buttons: [] },
    { state: 'draft', links: github, buttons: [] },
    { state: 'closed', links: github, buttons: [] },
    { state: 'blocked', links: github, buttons: [] },
  ])
})

it('offers Archive after the merge only to the workspace owner and the admins', () => {
  const merged = readyFeed(snapshotOf('merged'))
  const closed = readyFeed(snapshotOf('closed'))
  const admin: GitHubViewer = { id: 'priya', role: 'admin' }
  const member: GitHubViewer = { id: 'jonas', role: 'member' }

  expect([
    buttonsIn(renderBar(merged, ownerViewer)),
    buttonsIn(renderBar(merged, ownerViewer, 'input')),
    buttonsIn(renderBar(merged, admin)),
    buttonsIn(renderBar(merged, member)),
    buttonsIn(renderBar(merged, admin, 'archived')),
    buttonsIn(renderBar(closed, admin)),
  ]).toEqual([['Archive'], ['Archive'], ['Archive'], [], [], []])
})
