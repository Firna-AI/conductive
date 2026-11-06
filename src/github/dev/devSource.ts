import { githubPaths, type BannerState } from '../../shared/github'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import type { FetchLike } from '../githubClient'
import type { GitHubSource } from '../githubStore'

/** How the fake GitHub answers: at once, after two seconds, or with an error. */
export type GitHubMode = 'normal' | 'slow' | 'error'

export interface DevSource extends GitHubSource {
  /** Sends a live `github.updated` event with the fake data of a state. */
  emit: (state: BannerState) => void
  /** Makes the next load succeed, so that Try again recovers. */
  recover: () => void
}

const bannerPath = githubPaths.banner(FAKE_IDS.org, FAKE_IDS.workspace)

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The fake API of one banner state, as the development page uses it. */
export function createDevSource(
  state: BannerState,
  mode: GitHubMode,
): DevSource {
  const server = new FakeApiServer({ banner: state })
  if (mode === 'error') {
    const error = {
      code: 'github_unavailable',
      message: 'GitHub did not answer. Try again in a moment.',
    }
    server.json('GET', bannerPath, { error }, 503)
  }
  let eventNumber = server.events.history().throughEventNumber
  const fetch: FetchLike = async (input, init) => {
    if (mode === 'slow') await wait(2_000)
    return server.fetch(input, init)
  }
  return {
    fetch,
    subscribe: (after, listener) => server.events.subscribe(after, listener),
    emit: (next) => {
      eventNumber += 1
      const data = toolFixtures(next)
      server.events.emit({
        workspaceId: FAKE_IDS.workspace,
        eventNumber,
        occurredAt: FAKE_TIME,
        event: {
          type: 'github.updated',
          banner: data.banner.banner,
          checks: data.checks,
        },
      })
    },
    recover: () => server.json('GET', bannerPath, toolFixtures(state).banner),
  }
}
