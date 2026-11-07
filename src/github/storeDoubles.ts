import type { Delay } from '../app/events'
import { ManualDelay } from '../app/test-kit'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'
import { githubPaths, type BannerState } from '../shared/github'
import type { FakeApiServer } from '../test-support/fake-api'
import type { FakeWorkspaceEvents } from '../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { toolFixtures } from '../test-support/fixtures/tools'
import type { FetchLike, WorkspaceTarget } from './githubClient'
import { GitHubStore } from './githubStore'

/*
 * Test doubles for the store tests: GitHub events, a fake API that answers
 * at once but delivers late, and a stream whose stored history comes late,
 * as a socket's does. A store's timer runs only through a `ManualDelay`
 * that the test gives. Product code never imports this module.
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
  const state = store.getSnapshot()
  return state.status === 'ready' ? state.snapshot.banner.state : state.status
}

export function connect(
  store: GitHubStore,
  fetch: FetchLike,
  events: FakeWorkspaceEvents,
  delay: Delay = new ManualDelay().delay,
): () => void {
  return store.connect({
    fetch,
    subscribe: (after, listener) => events.subscribe(after, listener),
    delay,
  })
}

/**
 * A fetch whose server answers at once, with its state at that moment, as
 * the Worker reads the current state. The answers reach the store only when
 * the test releases them, as a slow network delivers them.
 */
export function heldReplies(server: FakeApiServer) {
  const held: (() => void)[] = []
  const responses: Promise<Response>[] = []
  const requestListeners = new Set<() => void>()
  const fetch: FetchLike = (input, init) => {
    const answer = server.fetch(input, init)
    const delivered = new Promise<void>((resolve) => {
      held.push(resolve)
    })
    const response = delivered.then(() => answer)
    responses.push(response)
    for (const listener of requestListeners) listener()
    return response
  }
  const release = async (): Promise<void> => {
    const released = responses.splice(0)
    for (const deliver of held.splice(0)) deliver()
    await Promise.all(released)
  }
  const onRequest = (listener: () => void): (() => void) => {
    requestListeners.add(listener)
    return () => {
      requestListeners.delete(listener)
    }
  }
  return { fetch, release, onRequest }
}

/** A reply either shows its state or starts a read after conflicting history. */
export function nextReadResult(
  store: GitHubStore,
  replies: ReturnType<typeof heldReplies>,
): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      stopState()
      stopRequest()
      resolve()
    }
    const stopState = store.subscribe(finish)
    const stopRequest = replies.onRequest(finish)
  })
}

/** The number of reads of a workspace's banner route that the server answered. */
export function readsOf(
  server: FakeApiServer,
  workspace: WorkspaceTarget = target,
): number {
  const path = githubPaths.banner(workspace.orgId, workspace.workspaceId)
  return server.requests.filter(
    (request) => new URL(request.url).pathname === path,
  ).length
}

/** Makes the fake API answer with the GitHub state of `state` from now on. */
export function serveState(server: FakeApiServer, state: BannerState): void {
  const data = toolFixtures(state)
  server.json(
    'GET',
    githubPaths.banner(target.orgId, target.workspaceId),
    data.banner,
  )
  server.json(
    'GET',
    githubPaths.checks(target.orgId, target.workspaceId),
    data.checks,
  )
}

/** Settles at the next state that the store shows. */
export function nextChange(store: GitHubStore): Promise<void> {
  return new Promise((resolve) => {
    const stop = store.subscribe(() => {
      stop()
      resolve()
    })
  })
}

/** A stream whose history comes later than the subscription, as a socket's does. */
export function lateHistory(
  store: GitHubStore,
  fetch: FetchLike,
  initial: WorkspaceEventEnvelope[] | null = null,
) {
  let listener: (message: WorkspaceSocketMessage) => void = () => undefined
  const deliver = (events: WorkspaceEventEnvelope[]) =>
    listener({
      type: 'history',
      history: { events, throughEventNumber: events.at(-1)?.eventNumber ?? 0 },
    })
  store.connect({
    fetch,
    subscribe: (_after, next) => {
      listener = next
      if (initial) deliver(initial)
      return () => undefined
    },
    delay: new ManualDelay().delay,
  })
  return deliver
}
