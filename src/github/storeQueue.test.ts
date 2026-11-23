import { expect, it } from 'vitest'
import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { toolFixtures } from '../test-support/fixtures/tools'
import { GitHubStore } from './githubStore'
import { connect, githubEvent, nextChange, target } from './storeDoubles'

const queue = {
  place: 2,
  count: 3,
  belowPullNumber: 479,
  trunk: 'main',
  state: 'queued',
  wait: null,
}

it('keeps the merge queue state of the last read over a GitHub event, which carries none', async () => {
  const server = new FakeApiServer({ banner: 'checks-running' })
  const { banner } = toolFixtures('checks-running').banner
  server.json('GET', githubPaths.banner(target.orgId, target.workspaceId), {
    banner,
    queue,
  })
  const events = new FakeWorkspaceEvents([])
  const store = new GitHubStore(target)
  connect(store, server.fetch, events)
  await nextChange(store)
  const read = store.getSnapshot()
  events.emit(githubEvent(1, 'checks-failed'))
  const live = store.getSnapshot()
  expect({
    read: read.status === 'ready' ? read.snapshot.queue : null,
    live:
      live.status === 'ready'
        ? [live.snapshot.banner.state, live.snapshot.queue]
        : null,
  }).toEqual({ read: queue, live: ['checks-failed', queue] })
})

it('reads a bar without a queue state, as from an older Worker, as a workspace outside the queue', async () => {
  const server = new FakeApiServer({ banner: 'checks-running' })
  const store = new GitHubStore(target)
  connect(store, server.fetch, new FakeWorkspaceEvents([]))
  await nextChange(store)
  const state = store.getSnapshot()
  expect(state.status === 'ready' && 'queue' in state.snapshot).toBe(false)
})

it('drops the saved merge and rebase facts when a live event changes the head', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const { banner } = toolFixtures('ready-to-merge').banner
  const oldBase = 'a'.repeat(40)
  const rebase = { base: 'lower-branch' }
  server.json('GET', githubPaths.banner(target.orgId, target.workspaceId), {
    banner,
    queue: { ...queue, oldBase, mergeAhead: 1, rebase: { ...rebase, oldBase } },
  })
  const events = new FakeWorkspaceEvents([])
  const store = new GitHubStore(target)
  connect(store, server.fetch, events)
  await nextChange(store)
  const envelope = githubEvent(1, 'ready-to-merge')
  const { event } = envelope
  if (event.type !== 'github.updated' || event.banner.pullRequest === null)
    throw new Error('Expected a pull request')
  events.emit({
    ...envelope,
    event: {
      ...event,
      banner: {
        ...event.banner,
        pullRequest: { ...event.banner.pullRequest, headSha: 'new-head' },
      },
    },
  })
  expect(store.getSnapshot()).toMatchObject({
    status: 'ready',
    snapshot: { queue: { ...queue, rebase } },
  })
  expect(store.getSnapshot()).not.toHaveProperty('snapshot.queue.oldBase')
  expect(store.getSnapshot()).not.toHaveProperty(
    'snapshot.queue.rebase.oldBase',
  )
  expect(store.getSnapshot()).not.toHaveProperty('snapshot.queue.mergeAhead')
})
