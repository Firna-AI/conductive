import { expect, it } from 'vitest'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { ChecksList } from './ChecksList'
import type { GitHubFeed } from './githubStore'
import { PullRequestBar } from './PullRequestBar'
import { PullRequestRow } from './PullRequestRow'
import { buttonsIn, feedOf, render, textOf } from './testing'

function renderViews(github: GitHubFeed): string[] {
  return [
    render(
      <PullRequestBar
        github={github}
        now={FAKE_TIME}
        onArchive={() => undefined}
        viewer={{ id: 'cal', role: 'admin' }}
        workspace={{
          owner: {
            id: 'cal',
            githubLogin: 'calummoore',
            displayName: null,
            avatarUrl: null,
          },
          state: 'ready',
        }}
      />,
    ),
    render(<PullRequestRow checksHref="/checks" github={github} />),
    render(<ChecksList github={github} touch />),
  ]
}

it('shows loading, then Try again after a failed load, in the bar, the row, and the Checks tab', () => {
  const loading = renderViews(feedOf({ status: 'loading' }))
  const failed = renderViews(
    feedOf({ status: 'error', message: 'GitHub did not answer.' }),
  )

  expect({
    loading: loading.map(textOf),
    failed: failed.map((html) => ({
      text: textOf(html),
      buttons: buttonsIn(html),
    })),
  }).toEqual({
    loading: ['Loading from GitHub', 'Loading from GitHub', 'Loading checks'],
    failed: [
      { text: 'GitHub state did not load Try again', buttons: ['Try again'] },
      { text: 'GitHub state did not load Try again', buttons: ['Try again'] },
      {
        text: 'Checks did not load GitHub did not answer. Try again',
        buttons: ['Try again'],
      },
    ],
  })
})
