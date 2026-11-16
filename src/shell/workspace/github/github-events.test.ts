import { describe, expect, test } from 'vitest'
import { WorkspaceStream } from '../../../app/events'
import { ManualDelay, RecordingEvents } from '../../../app/test-kit'
import { GitHubStore } from '../../../github/githubStore'
import {
  githubEvent,
  heldReplies,
  nextChange,
  nextReadResult,
  readsOf,
  shown,
  target,
} from '../../../github/storeDoubles'
import type { WorkspaceEventEnvelope } from '../../../shared/events'
import { FakeApiServer } from '../../../test-support/fake-api'
import { githubSubscribe } from './github-events'

/** One page of a replay whose pages share the cutoff `through`. */
function page(
  events: readonly WorkspaceEventEnvelope[],
  through: number,
  next?: number,
) {
  const history = { events, throughEventNumber: through }
  return {
    type: 'history',
    history:
      next === undefined
        ? history
        : { ...history, hasMore: true, nextAfterEventNumber: next },
  }
}

/** A GitHub store on the ordered stream, as the workspace screen connects it. */
function open(server: FakeApiServer) {
  const replies = heldReplies(server)
  const events = new RecordingEvents()
  const delay = new ManualDelay().delay
  const stream = new WorkspaceStream(events, target, delay)
  const store = new GitHubStore(target)
  const seen: string[] = []
  store.subscribe(() => seen.push(shown(store)))
  store.connect({
    fetch: replies.fetch,
    subscribe: githubSubscribe(stream),
    delay,
  })
  stream.start()
  return { replies, events, store, seen }
}

describe('the GitHub events of the ordered stream', () => {
  test('a replay shows only its newest GitHub state, and the read of the current state still shows', async () => {
    const server = new FakeApiServer()
    const { replies, events, store, seen } = open(server)
    events.send(
      page(
        [githubEvent(1, 'checks-running'), githubEvent(2, 'checks-failed')],
        3,
        2,
      ),
    )
    events.send(page([githubEvent(3, 'conflict')], 3))
    expect(seen).toEqual(['conflict'])

    // The reply and the replay have no known order, so the store reads again.
    const firstRead = nextReadResult(store, replies)
    await replies.release()
    await firstRead
    const changed = nextChange(store)
    await replies.release()
    await changed

    expect({ seen, reads: readsOf(server) }).toEqual({
      seen: ['conflict', 'ready-to-merge'],
      reads: 2,
    })
  })

  test('a live event after the replay shows at once', () => {
    const server = new FakeApiServer()
    const { events, seen } = open(server)
    events.send(page([githubEvent(1, 'checks-running')], 1))
    events.send({ type: 'event', envelope: githubEvent(2, 'merged') })
    expect(seen).toEqual(['checks-running', 'merged'])
  })
})
