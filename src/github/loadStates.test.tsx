import { expect, it } from 'vitest'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { ChecksList } from './ChecksList'
import type { GitHubFeed } from './githubStore'
import { PullRequestBar } from './PullRequestBar'
import { PullRequestRow } from './PullRequestRow'
import { buttonsIn, feedOf, render, textOf } from './testing'

/** Each screen as the app lays it out: the bar or the row over the Checks tab. */
function renderScreens(github: GitHubFeed) {
  const desktop = render(
    <>
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
      />
      <ChecksList github={github} />
    </>,
  )
  const phone = render(
    <>
      <PullRequestRow checksHref="/checks" github={github} />
      <ChecksList github={github} />
    </>,
  )
  return [desktop, phone].map((html) => ({
    text: textOf(html),
    buttons: buttonsIn(html),
  }))
}

it('shows loading, then one Try again on each screen after a failed load', () => {
  const loading = renderScreens(feedOf({ status: 'loading' }))
  const failed = renderScreens(
    feedOf({ status: 'error', message: 'GitHub did not answer.' }),
  )

  const loadingScreen = {
    text: 'Loading from GitHub Loading checks',
    buttons: [],
  }
  const failedScreen = {
    text: 'GitHub state did not load Try again Checks did not load GitHub did not answer.',
    buttons: ['Try again'],
  }
  expect({ loading, failed }).toEqual({
    loading: [loadingScreen, loadingScreen],
    failed: [failedScreen, failedScreen],
  })
})
