import { expect, it } from 'vitest'
import { ManualDelay } from '../app/test-kit'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'
import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { toolFixtures } from '../test-support/fixtures/tools'
import { GitHubStore } from './githubStore'
import {
  connect,
  githubEvent,
  heldReplies,
  nextChange,
  readsOf,
  serveState,
  shown,
  target,
} from './storeDoubles'
import { openTab, sameStateEvent } from './storeTabs'

const bannerPath = githubPaths.banner(target.orgId, target.workspaceId)
const checksPath = githubPaths.checks(target.orgId, target.workspaceId)
const unavailable = {
  error: { code: 'github_unavailable', message: 'GitHub did not answer.' },
}

it('shows the newest GitHub event of the history, and each live event after a load', async () => {
  const events = new FakeWorkspaceEvents([
    githubEvent(1, 'checks-running'),
    {
      workspaceId: target.workspaceId,
      eventNumber: 2,
      occurredAt: FAKE_TIME,
      event: { type: 'workspace.title', name: 'Address autocomplete' },
    },
    githubEvent(3, 'checks-failed'),
  ])
  const store = new GitHubStore(target)
  connect(store, new FakeApiServer({ banner: 'blocked' }).fetch, events)
  const fromHistory = shown(store)
  await nextChange(store)
  const loaded = shown(store)

  events.emit(githubEvent(4, 'merged'))

  expect([fromHistory, loaded, shown(store)]).toEqual([
    'checks-failed',
    'blocked',
    'merged',
  ])
})

it('keeps the current state when the stored history arrives before, during, or after the first read', async () => {
  const hourAgo = FAKE_TIME - 3_600_000
  const older = githubEvent(1, 'checks-running', { updatedAt: hourAgo })
  const newer = githubEvent(1, 'merged')
  const tabs: Record<'older' | 'same' | 'newer', unknown[]> = {
    older: [],
    same: [],
    newer: [],
  }
  for (const order of ['before', 'during', 'after'] as const) {
    const ready = () => new FakeApiServer({ banner: 'ready-to-merge' })
    tabs.older.push(await openTab(order, ready(), older))
    tabs.same.push(await openTab(order, ready(), sameStateEvent(1)))
    const server = ready()
    const merge = () => serveState(server, 'merged')
    tabs.newer.push(await openTab(order, server, newer, merge))
  }

  const once = { whileReading: null, reads: 1 }
  expect(tabs).toEqual({
    older: [
      { shown: 'ready-to-merge', ...once },
      { shown: 'ready-to-merge', whileReading: 'checks-running', reads: 2 },
      { shown: 'ready-to-merge', whileReading: 'ready-to-merge', reads: 2 },
    ],
    same: [
      { shown: 'ready-to-merge', ...once },
      { shown: 'ready-to-merge', ...once },
      { shown: 'ready-to-merge', ...once },
    ],
    newer: [
      { shown: 'merged', ...once },
      { shown: 'merged', whileReading: 'merged', reads: 2 },
      { shown: 'merged', whileReading: 'ready-to-merge', reads: 2 },
    ],
  })
})

it('keeps a live GitHub event that arrives while a read runs, whatever its time', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const replies = heldReplies(server)
  const store = new GitHubStore(target)
  connect(store, replies.fetch, server.events)
  const ready = nextChange(store)
  await replies.release()
  await ready
  const next = server.events.history().throughEventNumber + 1
  const hourAgo = FAKE_TIME - 3_600_000

  const loading = store.load()
  server.events.emit(githubEvent(next, 'merged', { updatedAt: hourAgo }))
  await replies.release()
  await loading

  expect({ shown: shown(store), reads: readsOf(server) }).toEqual({
    shown: 'merged',
    reads: 2,
  })
})

it('ignores the events of another workspace, and a load that ends after the workspace closed', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const store = new GitHubStore(target)
  connect(store, server.fetch, server.events)
  await nextChange(store)
  const next = server.events.history().throughEventNumber + 1
  server.events.emit(
    githubEvent(next, 'merged', { workspaceId: 'saved-carts' }),
  )

  const lateServer = new FakeApiServer({ banner: 'ready-to-merge' })
  const replies = heldReplies(lateServer)
  const closed = new GitHubStore(target)
  const disconnect = connect(closed, replies.fetch, new FakeWorkspaceEvents([]))
  const ready = nextChange(closed)
  await replies.release()
  await ready
  serveState(lateServer, 'conflict')
  const late = closed.load()
  disconnect()
  await replies.release()
  await late

  expect([shown(store), shown(closed)]).toEqual([
    'ready-to-merge',
    'ready-to-merge',
  ])
})

it('ignores a repeated or an older event after a newer one', () => {
  const events = new FakeWorkspaceEvents([])
  const store = new GitHubStore(target)
  connect(store, new FakeApiServer().fetch, events)

  events.emit(githubEvent(5, 'merged'))
  events.emit(githubEvent(5, 'checks-running'))
  events.emit(githubEvent(4, 'conflict'))

  expect(shown(store)).toBe('merged')
})

it('shows an error for a failed or a broken reply, loads again on Try again, and keeps a shown state when a reload fails', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const store = new GitHubStore(target)
  server.json('GET', bannerPath, unavailable, 503)
  connect(store, server.fetch, new FakeWorkspaceEvents([]))
  await nextChange(store)
  const failed = store.getSnapshot()
  server.json('GET', bannerPath, toolFixtures('ready-to-merge').banner)
  server.json('GET', checksPath, {
    state: 'available',
    checks: [{ id: 'check-0', name: 'build' }],
  })
  await store.retry()
  const broken = store.getSnapshot()
  server.json('GET', checksPath, toolFixtures('ready-to-merge').checks)
  await store.retry()
  const loaded = shown(store)
  server.json('GET', bannerPath, unavailable, 503)
  await store.retry()

  expect([failed, broken, loaded, shown(store)]).toEqual([
    { status: 'error', message: 'GitHub did not answer.' },
    { status: 'error', message: null },
    'ready-to-merge',
    'ready-to-merge',
  ])
})

it('shows the newest state of all history pages after the final page, then the live events that waited', () => {
  const store = new GitHubStore(target)
  let send: (message: WorkspaceSocketMessage) => void = () => {}
  store.connect({
    fetch: new FakeApiServer().fetch,
    subscribe: (_after, listener) => {
      send = listener
      return () => {}
    },
    delay: new ManualDelay().delay,
  })
  const states: string[] = []
  store.subscribe(() => states.push(shown(store)))
  const page = (
    events: WorkspaceEventEnvelope[],
    next?: number,
  ): WorkspaceSocketMessage => ({
    type: 'history',
    history:
      next === undefined
        ? { events, throughEventNumber: 10 }
        : {
            events,
            throughEventNumber: 10,
            hasMore: true,
            nextAfterEventNumber: next,
          },
  })
  send(page([githubEvent(2, 'checks-running')], 5))
  send({ type: 'event', envelope: githubEvent(11, 'merged') })
  expect(states).toEqual([])
  send(page([githubEvent(8, 'checks-failed')]))
  expect(states).toEqual(['checks-failed', 'merged'])
})
