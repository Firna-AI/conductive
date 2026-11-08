import { browserDelay } from '../../app/events'
import { githubPaths, type BannerState } from '../../shared/github'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import type { FetchLike } from '../githubClient'
import type { GitHubSource } from '../githubStore'
import { sampleReplies, type Sample } from './devSamples'

/** How the fake GitHub answers: at once, after two seconds, or with an error. */
export type GitHubMode = 'normal' | 'slow' | 'error'

export interface DevSource extends GitHubSource {
  /** Sends a live `github.updated` event with the sample data of a state. */
  emit: (state: BannerState) => void
  /** Makes the next load succeed, so that Try again recovers. */
  recover: () => void
}

const bannerPath = githubPaths.banner(FAKE_IDS.org, FAKE_IDS.workspace)
const checksPath = githubPaths.checks(FAKE_IDS.org, FAKE_IDS.workspace)

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * The fake API of one banner state and sample, as the development page uses
 * it. The replies and the live events of a sample carry the same data.
 */
export function createDevSource(
  state: BannerState,
  mode: GitHubMode,
  sample: Sample,
): DevSource {
  const server = new FakeApiServer({ banner: state })
  let replies = sampleReplies(sample, state)
  let failing = mode === 'error'
  if (sample !== 'fake') {
    server.json('GET', bannerPath, replies.banner)
    server.json('GET', checksPath, replies.checks)
  }
  if (failing) {
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
    delay: browserDelay,
    emit: (next) => {
      eventNumber += 1
      const data = sampleReplies(sample, next)
      replies = data
      if (!failing) server.json('GET', bannerPath, data.banner)
      server.json('GET', checksPath, data.checks)
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
    recover: () => {
      failing = false
      server.json('GET', bannerPath, replies.banner)
      server.json('GET', checksPath, replies.checks)
    },
  }
}
