import { expect, it } from 'vitest'
import type { Delay } from '../app/events'
import { ManualDelay } from '../app/test-kit'
import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { GitHubStore, type GitHubState } from './githubStore'
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
import { snapshotOf } from './testing'

/*
 * The fresh reads of an open workspace on its slow timer. The timer runs
 * only when a test runs the timers of its `ManualDelay`.
 */

const bannerPath = githubPaths.banner(target.orgId, target.workspaceId)
const unavailable = {
  error: { code: 'github_unavailable', message: 'GitHub did not answer.' },
}

it('reads the GitHub state again on the slow timer without any GitHub event, and a failed timed read keeps the shown state', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const timers = new ManualDelay()
  const store = new GitHubStore(target)
  connect(store, server.fetch, new FakeWorkspaceEvents([]), timers.delay)
  await nextChange(store)
  const firstRead = { shown: shown(store), waiting: timers.pending }
  serveState(server, 'merged')

  await timers.runAll()
  const timedRead = { shown: shown(store), waiting: timers.pending }
  server.json('GET', bannerPath, unavailable, 503)
  await timers.runAll()

  expect({ firstRead, timedRead, shown: shown(store) }).toEqual({
    firstRead: { shown: 'ready-to-merge', waiting: 1 },
    timedRead: { shown: 'merged', waiting: 1 },
    shown: 'merged',
  })
  expect({ reads: readsOf(server), waiting: timers.pending }).toEqual({
    reads: 3,
    waiting: 1,
  })
})

it('keeps a shown error without loading through a failed timed read, and shows the state of a later timed read', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  server.json('GET', bannerPath, unavailable, 503)
  const replies = heldReplies(server)
  const timers = new ManualDelay()
  const store = new GitHubStore(target)
  const states: GitHubState[] = []
  store.subscribe(() => states.push(store.getSnapshot()))
  connect(store, replies.fetch, new FakeWorkspaceEvents([]), timers.delay)
  const failed = nextChange(store)
  await replies.release()
  await failed

  const failing = timers.runAll()
  const whileReading = store.getSnapshot()
  await replies.release()
  await failing
  serveState(server, 'ready-to-merge')
  const loading = timers.runAll()
  await replies.release()
  await loading

  const error = { status: 'error', message: 'GitHub did not answer.' }
  expect({ whileReading, states, reads: readsOf(server) }).toEqual({
    whileReading: error,
    states: [
      error,
      { status: 'ready', snapshot: snapshotOf('ready-to-merge') },
    ],
    reads: 3,
  })
})

it('stops the timer at disconnect, and ignores a timed read that ends after it', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const replies = heldReplies(server)
  const timers = new ManualDelay()
  const store = new GitHubStore(target)
  const events = new FakeWorkspaceEvents([])
  const leave = connect(store, replies.fetch, events, timers.delay)
  const loaded = nextChange(store)
  await replies.release()
  await loaded
  const beforeLeave = timers.pending
  leave()
  const afterLeave = timers.pending

  const leaveAgain = connect(store, replies.fetch, events, timers.delay)
  const reloaded = nextChange(store)
  await replies.release()
  await reloaded
  serveState(server, 'merged')
  const timed = timers.runAll()
  leaveAgain()
  await replies.release()
  await timed

  expect({ beforeLeave, afterLeave }).toEqual({ beforeLeave: 1, afterLeave: 0 })
  expect({
    shown: shown(store),
    reads: readsOf(server),
    waiting: timers.pending,
  }).toEqual({ shown: 'ready-to-merge', reads: 3, waiting: 0 })
})

it('stops the timer while another read runs, keeps it through a live event, and starts it again when a live event cancels a timed read', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const replies = heldReplies(server)
  const timers = new ManualDelay()
  let timersSet = 0
  const delay: Delay = (ms, run) => {
    timersSet += 1
    return timers.delay(ms, run)
  }
  const store = new GitHubStore(target)
  connect(store, replies.fetch, server.events, delay)
  const loaded = nextChange(store)
  await replies.release()
  await loaded
  const next = server.events.history().throughEventNumber + 1
  server.events.emit(githubEvent(next, 'checks-running'))
  const afterEvent = { set: timersSet, waiting: timers.pending }

  const retrying = store.retry()
  const duringRetry = timers.pending
  await replies.release()
  await retrying
  const timed = timers.runAll()
  server.events.emit(githubEvent(next + 1, 'merged'))
  const afterCancel = timers.pending
  await replies.release()
  await timed

  expect({ afterEvent, duringRetry, afterCancel }).toEqual({
    afterEvent: { set: 1, waiting: 1 },
    duringRetry: 0,
    afterCancel: 1,
  })
  expect({
    shown: shown(store),
    reads: readsOf(server),
    set: timersSet,
  }).toEqual({ shown: 'merged', reads: 3, set: 3 })
})
