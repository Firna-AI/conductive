import type { WorkspaceEventEnvelope } from '../shared/events'
import type { GitHubChecksResponse } from '../shared/github'
import type { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { toolFixtures } from '../test-support/fixtures/tools'
import type { PullRequestBanner } from './bannerStatus'
import { GitHubStore } from './githubStore'
import {
  heldReplies,
  lateHistory,
  nextChange,
  nextReadResult,
  readsOf,
  shown,
  target,
} from './storeDoubles'
import { pullRequestBanner } from './testing'

/*
 * Tab openings for the store tests, with the stored history before, during,
 * or after the first read. Product code never imports this module.
 */

/**
 * The fake's ready-to-merge state as an event, with the keys of each object
 * in the reverse order and another banner time. It shows the same state.
 */
export function sameStateEvent(eventNumber: number): WorkspaceEventEnvelope {
  const banner = pullRequestBanner('ready-to-merge')
  const { checks } = toolFixtures('ready-to-merge')
  const reversed: PullRequestBanner = {
    closedAt: banner.closedAt,
    mergedAt: banner.mergedAt,
    changesRequestedBy: [...banner.changesRequestedBy],
    review: banner.review,
    pullRequest: {
      headSha: banner.pullRequest.headSha,
      url: banner.pullRequest.url,
      title: banner.pullRequest.title,
      number: banner.pullRequest.number,
    },
    state: banner.state,
    updatedAt: FAKE_TIME - 60_000,
    baseBranch: banner.baseBranch,
    branch: banner.branch,
  }
  const reversedChecks: GitHubChecksResponse = {
    checks: checks.checks.map((check) => ({
      durationMs: check.durationMs,
      completedAt: check.completedAt,
      startedAt: check.startedAt,
      url: check.url,
      state: check.state,
      name: check.name,
      id: check.id,
    })),
    state: checks.state,
  }
  return {
    workspaceId: target.workspaceId,
    eventNumber,
    occurredAt: FAKE_TIME,
    event: { type: 'github.updated', banner: reversed, checks: reversedChecks },
  }
}

export type Delivery = 'before' | 'during' | 'after'

/**
 * Opens a tab whose stored history arrives before, during, or after its
 * first read. `change` is a GitHub change on the server after the first
 * read, which the history holds. The result says what the tab shows at the
 * end, what it shows while a second read runs, and how many reads it made.
 */
export async function openTab(
  order: Delivery,
  server: FakeApiServer,
  history: WorkspaceEventEnvelope,
  change: () => void = () => undefined,
) {
  const replies = heldReplies(server)
  const store = new GitHubStore(target)
  if (order === 'before') change()
  const deliverHistory = lateHistory(
    store,
    replies.fetch,
    order === 'before' ? [history] : null,
  )
  if (order !== 'before') change()
  if (order === 'during') deliverHistory([history])
  const firstRead = nextReadResult(store, replies)
  await replies.release()
  await firstRead
  if (order === 'after') deliverHistory([history])
  const reads = readsOf(server)
  let whileReading: string | null = null
  if (reads > 1) {
    whileReading = shown(store)
    const changed = nextChange(store)
    await replies.release()
    await changed
  }
  return { shown: shown(store), whileReading, reads }
}
