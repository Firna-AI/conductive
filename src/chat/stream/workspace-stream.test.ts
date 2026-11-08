import { describe, expect, it } from 'vitest'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../../shared/events'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import type { StreamEnvelope } from '../api/read-workspace'
import { manualTimers } from '../state/test-kit'
import { WorkspaceStream, type StreamListener } from './workspace-stream'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }

function delta(
  eventNumber: number,
  text: string,
  workspaceId: string = target.workspaceId,
): WorkspaceEventEnvelope {
  return {
    workspaceId,
    eventNumber,
    occurredAt: FAKE_TIME,
    event: {
      type: 'assistant.delta',
      sessionId: FAKE_IDS.session,
      turnId: 'turn-1',
      messageId: 'answer-1',
      text,
    },
  }
}

/** One page of a stored history whose pages share the cutoff `through`. */
function page(
  events: readonly WorkspaceEventEnvelope[],
  through: number,
  next?: number,
): WorkspaceSocketMessage {
  const history = { events, throughEventNumber: through }
  return {
    type: 'history',
    history:
      next === undefined
        ? history
        : { ...history, hasMore: true, nextAfterEventNumber: next },
  }
}

function streamOn(events: FakeWorkspaceEvents) {
  const delivered: StreamEnvelope[] = []
  const opened: number[] = []
  const listeners: StreamListener[] = []
  const timers = manualTimers()
  const stream = new WorkspaceStream({
    target,
    timers,
    deliver: (envelopes) => delivered.push(...envelopes),
    subscribe: (_target, after, listener) => {
      opened.push(after)
      listeners.push(listener)
      return events.subscribe(after, (message) => listener.message(message))
    },
  })
  const numbers = () => delivered.map((envelope) => envelope.eventNumber)
  return { stream, delivered, numbers, opened, listeners, timers }
}

describe('WorkspaceStream', () => {
  it('applies the stored history, then each live event once, in order', () => {
    const events = new FakeWorkspaceEvents(recordedChatEvents('running'))
    const { stream, numbers } = streamOn(events)
    stream.start(5)
    events.emit(delta(8, 'Next part.'))
    events.emit(delta(8, 'Next part.'))
    events.emit(delta(7, 'An old part.'))
    expect(numbers()).toEqual([6, 7, 8])
    expect(stream.through).toBe(8)
  })

  it('holds an event after a gap, opens again after the cursor, and keeps the order', () => {
    const { stream, numbers, opened, listeners, timers } = streamOn(
      new FakeWorkspaceEvents([]),
    )
    stream.start(7)
    // Event 8 got lost on the way, so event 9 arrives after a gap.
    listeners[0].message({ type: 'event', envelope: delta(9, 'second') })
    expect(numbers()).toEqual([])
    timers.runAll()
    expect(opened).toEqual([7, 7])
    listeners[1].message(page([delta(8, 'first'), delta(9, 'second')], 9))
    expect(numbers()).toEqual([8, 9])
  })

  it('ignores the events of another workspace', () => {
    const events = new FakeWorkspaceEvents([])
    const { stream, delivered } = streamOn(events)
    stream.start(0)
    events.emit(delta(1, 'elsewhere', 'other-workspace'))
    events.emit(delta(1, 'here'))
    expect(
      delivered.map(({ workspaceId, eventNumber }) => [
        workspaceId,
        eventNumber,
      ]),
    ).toEqual([[target.workspaceId, 1]])
  })

  it('opens a new connection after its cursor when the connection drops', () => {
    const events = new FakeWorkspaceEvents(recordedChatEvents('running'))
    const { stream, opened, listeners, timers, numbers } = streamOn(events)
    stream.start(7)
    listeners[0].closed()
    events.emit(delta(8, 'sent while the tab was away'))
    expect(numbers()).toEqual([])
    timers.runAll()
    expect(opened).toEqual([7, 7])
    expect(numbers()).toEqual([8])
  })

  it('applies history pages across left-out numbers, and holds live events until the final page', () => {
    const { stream, numbers, opened, listeners, timers } = streamOn(
      new FakeWorkspaceEvents([]),
    )
    stream.start(0)
    const socket = listeners[0]
    socket.message(page([delta(1, 'a'), delta(3, 'b')], 10, 4))
    socket.message({ type: 'event', envelope: delta(11, 'live') })
    expect(numbers()).toEqual([1, 3])
    socket.message(page([delta(6, 'c'), delta(9, 'd')], 10, 9))
    expect(numbers()).toEqual([1, 3, 6, 9])
    expect(stream.through).toBe(9)
    socket.message(page([delta(10, 'e')], 10))
    expect(numbers()).toEqual([1, 3, 6, 9, 10, 11])
    expect(stream.through).toBe(11)
    timers.runAll()
    expect(opened).toEqual([0])
  })

  it('opens again after the cutoff when a held live event follows a gap', () => {
    const { stream, numbers, opened, listeners, timers } = streamOn(
      new FakeWorkspaceEvents([]),
    )
    stream.start(0)
    listeners[0].message(page([delta(2, 'a')], 5, 2))
    listeners[0].message({ type: 'event', envelope: delta(7, 'after a gap') })
    listeners[0].message(page([delta(5, 'b')], 5))
    expect(numbers()).toEqual([2, 5])
    timers.runAll()
    expect(opened).toEqual([0, 5])
  })

  it('opens again after the page progress when the connection drops between pages', () => {
    const { stream, numbers, opened, listeners, timers } = streamOn(
      new FakeWorkspaceEvents([]),
    )
    stream.start(0)
    listeners[0].message(page([delta(1, 'a')], 9, 4))
    listeners[0].closed()
    timers.runAll()
    expect(opened).toEqual([0, 4])
    listeners[1].message(page([delta(6, 'b')], 12))
    expect(numbers()).toEqual([1, 6])
    expect(stream.through).toBe(12)
  })
})
