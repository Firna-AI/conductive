import { describe, expect, test } from 'vitest'
import type { StreamHandlers, WorkspaceEventSource } from './events'
import { replaySubscribe } from './replay-socket'
import { ManualDelay } from './test-kit'

/** An event source whose connections the test feeds and drops. */
function scriptedSource() {
  const connections: { after: number; handlers: StreamHandlers }[] = []
  const source: WorkspaceEventSource = {
    open: (target, handlers) => {
      connections.push({ after: target.afterEventNumber, handlers })
      return () => undefined
    },
  }
  return { source, connections }
}

const history = (through: number) => ({
  type: 'history',
  history: { events: [], throughEventNumber: through },
})

/** A page of a replay with more to come, as the Worker sends it. */
const page = (through: number, next: number) => ({
  type: 'history',
  history: {
    events: [],
    throughEventNumber: through,
    hasMore: true,
    nextAfterEventNumber: next,
  },
})

const live = (eventNumber: number) => ({
  type: 'event',
  envelope: {
    workspaceId: 'workspace-1',
    eventNumber,
    occurredAt: 0,
    event: { type: 'files.unavailable' },
  },
})

describe('the event stream of a store that reads raw messages', () => {
  test('opens again after the newest event that it delivered when the connection drops, and an end cancels the wait', async () => {
    const { source, connections } = scriptedSource()
    const timers = new ManualDelay()
    const received: unknown[] = []
    const subscribe = replaySubscribe(
      source,
      { orgId: 'org-1', workspaceId: 'workspace-1' },
      timers.delay,
    )
    const end = subscribe(4, (message) => received.push(message))
    connections[0].handlers.message(history(6))
    connections[0].handlers.message(live(7))
    connections[0].handlers.closed()

    expect(received).toEqual([history(6), live(7)])
    expect(timers.waits).toEqual([1_000])
    await timers.runAll()
    expect(connections.map((connection) => connection.after)).toEqual([4, 7])

    connections[1].handlers.closed()
    expect(timers.pending).toBe(1)
    end()
    expect(timers.pending).toBe(0)
    expect(connections).toHaveLength(2)
  })

  test('opens again after the start of the next page when the connection drops during a paged replay, and after the cutoff once the replay ends', async () => {
    const { source, connections } = scriptedSource()
    const timers = new ManualDelay()
    const received: unknown[] = []
    const subscribe = replaySubscribe(
      source,
      { orgId: 'org-1', workspaceId: 'workspace-1' },
      timers.delay,
    )
    subscribe(0, (message) => received.push(message))
    connections[0].handlers.message(page(9, 5))
    // A live event can come before the final page. It waits in the store.
    connections[0].handlers.message(live(10))
    connections[0].handlers.closed()
    await timers.runAll()
    connections[1].handlers.message(history(12))
    connections[1].handlers.closed()
    await timers.runAll()

    expect(received).toEqual([page(9, 5), live(10), history(12)])
    expect(connections.map((connection) => connection.after)).toEqual([
      0, 5, 12,
    ])
  })
})
