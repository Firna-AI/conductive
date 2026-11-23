import { expect, it } from 'vitest'
import { githubPaths, type BannerState } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { toolFixtures } from '../test-support/fixtures/tools'
import type { FetchLike } from './githubClient'
import { GitHubStore } from './githubStore'
import {
  connect,
  githubEvent,
  heldReplies,
  nextChange,
  serveState,
  shown,
  target,
} from './storeDoubles'

const storedPath = githubPaths.stored(target.orgId, target.workspaceId)
const bannerPath = githubPaths.banner(target.orgId, target.workspaceId)
const unavailable = {
  error: { code: 'github_unavailable', message: 'GitHub did not answer.' },
}

/** Serves `state` as the state that the Worker stored. */
function serveStored(server: FakeApiServer, state: BannerState | null): void {
  const data = state === null ? null : toolFixtures(state)
  server.json('GET', storedPath, {
    state: data && { banner: data.banner.banner, checks: data.checks },
  })
}

/**
 * A fetch that holds the replies of one kind, the stored read or the fresh
 * GitHub reads, until the test releases that kind. Each change of the
 * store goes into `seen`.
 */
function heldKinds(server: FakeApiServer) {
  const held = { stored: [] as (() => void)[], fresh: [] as (() => void)[] }
  const replies = {
    stored: [] as Promise<unknown>[],
    fresh: [] as Promise<unknown>[],
  }
  const fetch: FetchLike = (input, init) => {
    const kind = input === storedPath ? 'stored' : 'fresh'
    const answer = server.fetch(input, init)
    const reply = new Promise<void>((resolve) => {
      held[kind].push(resolve)
    }).then(() => answer)
    replies[kind].push(reply)
    return reply
  }
  const release = async (kind: 'stored' | 'fresh'): Promise<void> => {
    const waiting = replies[kind].splice(0)
    for (const deliver of held[kind].splice(0)) deliver()
    await Promise.allSettled(waiting)
    // The store handles a reply in the reactions after its body.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return { fetch, release }
}

function watch(store: GitHubStore): string[] {
  const seen = [shown(store)]
  store.subscribe(() => seen.push(shown(store)))
  return seen
}

it('shows the stored state at once, and the fresh GitHub reply after it', async () => {
  const server = new FakeApiServer({ banner: 'merged' })
  serveStored(server, 'ready-to-merge')
  const replies = heldKinds(server)
  const store = new GitHubStore(target)
  const seen = watch(store)
  connect(store, replies.fetch, new FakeWorkspaceEvents([]))

  await replies.release('stored')
  const beforeGitHub = shown(store)
  await replies.release('fresh')

  expect(beforeGitHub).toBe('ready-to-merge')
  expect(seen).toEqual(['loading', 'ready-to-merge', 'merged'])
})

it('keeps loading while no state is stored, or while the stored read fails', async () => {
  const outcomes: string[][] = []
  for (const stored of ['none', 'failed'] as const) {
    const server = new FakeApiServer({ banner: 'merged' })
    if (stored === 'none') serveStored(server, null)
    else server.json('GET', storedPath, unavailable, 503)
    const replies = heldKinds(server)
    const store = new GitHubStore(target)
    const seen = watch(store)
    connect(store, replies.fetch, new FakeWorkspaceEvents([]))
    await replies.release('stored')
    await replies.release('fresh')
    outcomes.push(seen)
  }

  expect(outcomes).toEqual([
    ['loading', 'merged'],
    ['loading', 'merged'],
  ])
})

it('drops a stored reply that comes after the fresh reply or a live event', async () => {
  const outcomes: string[][] = []
  for (const first of ['fresh', 'event'] as const) {
    const server = new FakeApiServer({ banner: 'merged' })
    serveStored(server, 'checks-running')
    const replies = heldKinds(server)
    const events = new FakeWorkspaceEvents([])
    const store = new GitHubStore(target)
    const seen = watch(store)
    connect(store, replies.fetch, events)
    if (first === 'fresh') await replies.release('fresh')
    else events.emit(githubEvent(1, 'merged'))
    await replies.release('stored')
    outcomes.push(seen)
  }

  expect(outcomes).toEqual([
    ['loading', 'merged'],
    ['loading', 'merged'],
  ])
})

it('keeps the stored state when the fresh GitHub read fails', async () => {
  const server = new FakeApiServer({ banner: 'merged' })
  serveStored(server, 'checks-failed')
  server.json('GET', bannerPath, unavailable, 503)
  const replies = heldKinds(server)
  const store = new GitHubStore(target)
  const seen = watch(store)
  connect(store, replies.fetch, new FakeWorkspaceEvents([]))

  await replies.release('stored')
  await replies.release('fresh')

  expect(seen).toEqual(['loading', 'checks-failed'])
})

it('reads no stored state when it connects again with a state that shows', async () => {
  const server = new FakeApiServer({ banner: 'merged' })
  serveStored(server, 'checks-running')
  const store = new GitHubStore(target)
  const events = new FakeWorkspaceEvents([])
  const disconnect = connect(store, server.fetch, events)
  await store.load()
  disconnect()
  const storedReads = () =>
    server.requests.filter(
      (request) => new URL(request.url).pathname === storedPath,
    ).length
  const before = storedReads()

  connect(store, server.fetch, events)
  await store.load()

  expect([before, storedReads(), shown(store)]).toEqual([1, 1, 'merged'])
})

it('keeps the live banner and applies the queue from the in-flight bar read', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const events = new FakeWorkspaceEvents([])
  const replies = heldReplies(server)
  const store = new GitHubStore(target)
  connect(store, replies.fetch, events)
  const ready = nextChange(store)
  await replies.release()
  await ready

  server.json('GET', bannerPath, {
    ...toolFixtures('ready-to-merge').banner,
    queue: {
      place: 1,
      count: 1,
      belowPullNumber: null,
      trunk: 'main',
      state: 'queued',
      wait: null,
    },
  })
  const loading = store.load()
  events.emit(githubEvent(1, 'checks-running'))
  await replies.release()
  await loading
  expect(store.getSnapshot()).toMatchObject({
    status: 'ready',
    snapshot: { banner: { state: 'checks-running' }, queue: { place: 1 } },
  })
})

it('keeps the live pull request queue when an in-flight reply has no pull request', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  server.json('GET', bannerPath, {
    ...toolFixtures('ready-to-merge').banner,
    queue: {
      place: 1,
      count: 1,
      belowPullNumber: null,
      trunk: 'main',
      state: 'queued',
      wait: null,
    },
  })
  const events = new FakeWorkspaceEvents([])
  const replies = heldReplies(server)
  const store = new GitHubStore(target)
  connect(store, replies.fetch, events)
  const ready = nextChange(store)
  await replies.release()
  await ready

  serveState(server, 'none')
  const loading = store.load()
  events.emit(githubEvent(1, 'checks-running'))
  await replies.release()
  await loading
  expect(store.getSnapshot()).toMatchObject({
    status: 'ready',
    snapshot: { banner: { state: 'checks-running' }, queue: { place: 1 } },
  })
})
