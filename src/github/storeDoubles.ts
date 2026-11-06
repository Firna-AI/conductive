import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'
import type { BannerState } from '../shared/github'
import type { FakeApiServer } from '../test-support/fake-api'
import type { FakeWorkspaceEvents } from '../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { toolFixtures } from '../test-support/fixtures/tools'
import type { FetchLike } from './githubClient'
import { GitHubStore } from './githubStore'

/*
 * Test doubles for the store tests: GitHub events, a slow fetch, and a
 * stream whose stored history comes late, as a socket's does. Product code
 * never imports this module.
 */

export const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }

/** A GitHub event. Its banner changed at `updatedAt`, `FAKE_TIME` by default. */
export function githubEvent(
  eventNumber: number,
  state: BannerState,
  changes: { workspaceId?: string; updatedAt?: number } = {},
): WorkspaceEventEnvelope {
  const data = toolFixtures(state)
  const updatedAt = changes.updatedAt ?? FAKE_TIME
  return {
    workspaceId: changes.workspaceId ?? target.workspaceId,
    eventNumber,
    occurredAt: updatedAt,
    event: {
      type: 'github.updated',
      banner: { ...data.banner.banner, updatedAt },
      checks: data.checks,
    },
  }
}

/** What the bar shows: the banner state, or loading, or error. */
export function shown(store: GitHubStore): string {
  const state = store.getState()
  return state.status === 'ready' ? state.snapshot.banner.state : state.status
}

export function connect(
  store: GitHubStore,
  fetch: FetchLike,
  events: FakeWorkspaceEvents,
): () => void {
  return store.connect({
    fetch,
    subscribe: (after, listener) => events.subscribe(after, listener),
  })
}

/** A fetch that waits until the test lets it answer, as a slow network does. */
export function heldFetch(server: FakeApiServer) {
  let answer = () => undefined as void
  const answered = new Promise<void>((resolve) => {
    answer = resolve
  })
  const fetch: FetchLike = async (input, init) => {
    await answered
    return server.fetch(input, init)
  }
  return { fetch, answer }
}

/** A stream whose history comes later than the subscription, as a socket's does. */
export function lateHistory(store: GitHubStore, fetch: FetchLike) {
  let listener: (message: WorkspaceSocketMessage) => void = () => undefined
  store.connect({
    fetch,
    subscribe: (_after, next) => {
      listener = next
      return () => undefined
    },
  })
  return (events: WorkspaceEventEnvelope[]) =>
    listener({
      type: 'history',
      history: { events, throughEventNumber: events.at(-1)?.eventNumber ?? 0 },
    })
}

/** Loads once, and delivers the history before, during, or after the load. */
export async function deliverHistory(
  order: 'before' | 'during' | 'after',
  history: WorkspaceEventEnvelope,
  server: FakeApiServer,
): Promise<string> {
  const store = new GitHubStore(target)
  const deliver = lateHistory(store, server.fetch)
  if (order === 'before') deliver([history])
  const loading = store.load()
  if (order === 'during') deliver([history])
  await loading
  if (order === 'after') deliver([history])
  return shown(store)
}
