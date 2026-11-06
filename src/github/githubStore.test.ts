import { expect, it } from 'vitest'
import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { toolFixtures } from '../test-support/fixtures/tools'
import { GitHubStore } from './githubStore'
import {
  connect,
  deliverHistory,
  githubEvent,
  heldFetch,
  shown,
  target,
} from './storeDoubles'

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
  connect(store, new FakeApiServer().fetch, events)
  const fromHistory = shown(store)
  await store.load()
  const loaded = shown(store)

  events.emit(githubEvent(4, 'merged'))

  expect([fromHistory, loaded, shown(store)]).toEqual([
    'checks-failed',
    'ready-to-merge',
    'merged',
  ])
})

it('keeps the newer of the history and a load in each delivery order, and keeps it when a reload fails', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const hourAgo = FAKE_TIME - 3_600_000
  const older = githubEvent(1, 'checks-running', { updatedAt: hourAgo })
  const same = githubEvent(1, 'checks-failed', { updatedAt: FAKE_TIME })
  const newer = githubEvent(1, 'merged', { updatedAt: FAKE_TIME + 60_000 })
  const histories = { older, same, newer }
  const shownAfter = {
    older: [] as string[],
    same: [] as string[],
    newer: [] as string[],
  }
  for (const order of ['before', 'during', 'after'] as const) {
    for (const age of ['older', 'same', 'newer'] as const) {
      shownAfter[age].push(await deliverHistory(order, histories[age], server))
    }
  }

  const reloaded = new GitHubStore(target)
  connect(reloaded, server.fetch, new FakeWorkspaceEvents([]))
  await reloaded.load()
  server.json('GET', bannerPath, unavailable, 503)
  await reloaded.retry()

  expect({ ...shownAfter, afterFailedReload: shown(reloaded) }).toEqual({
    older: ['ready-to-merge', 'ready-to-merge', 'ready-to-merge'],
    same: ['ready-to-merge', 'ready-to-merge', 'ready-to-merge'],
    newer: ['merged', 'merged', 'merged'],
    afterFailedReload: 'ready-to-merge',
  })
})

it('keeps a GitHub event that arrives while an older load is on its way', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const held = heldFetch(server)
  const store = new GitHubStore(target)
  connect(store, held.fetch, server.events)
  const next = server.events.history().throughEventNumber + 1

  const loading = store.load()
  server.events.emit(githubEvent(next, 'merged'))
  held.answer()
  await loading

  expect(shown(store)).toBe('merged')
})

it('ignores the events of another workspace, and a load that ends after the workspace closed', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const store = new GitHubStore(target)
  connect(store, server.fetch, server.events)
  await store.load()
  const next = server.events.history().throughEventNumber + 1
  server.events.emit(
    githubEvent(next, 'merged', { workspaceId: 'saved-carts' }),
  )

  const held = heldFetch(new FakeApiServer({ banner: 'conflict' }))
  const closed = new GitHubStore(target)
  const disconnect = connect(closed, held.fetch, new FakeWorkspaceEvents([]))
  const late = closed.load()
  disconnect()
  held.answer()
  await late

  expect([shown(store), shown(closed)]).toEqual(['ready-to-merge', 'loading'])
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

it('shows an error for a failed or a broken reply, and loads again on Try again', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const store = new GitHubStore(target)
  connect(store, server.fetch, new FakeWorkspaceEvents([]))

  server.json('GET', bannerPath, unavailable, 503)
  await store.load()
  const failed = store.getState()
  server.json('GET', bannerPath, toolFixtures('ready-to-merge').banner)
  server.json('GET', checksPath, {
    state: 'available',
    checks: [{ id: 'check-0', name: 'build' }],
  })
  await store.retry()
  const broken = store.getState()
  server.json('GET', checksPath, toolFixtures('ready-to-merge').checks)
  await store.retry()

  expect([failed, broken, shown(store)]).toEqual([
    { status: 'error', message: 'GitHub did not answer.' },
    { status: 'error', message: null },
    'ready-to-merge',
  ])
})
