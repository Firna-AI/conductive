import { describe, expect, it } from 'vitest'
import type { WorkspaceEventEnvelope } from '../../shared/events'
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
    const events = new FakeWorkspaceEvents(recordedChatEvents('running'))
    const { stream, numbers, opened, timers } = streamOn(events)
    stream.start(7)
    events.emit(delta(9, 'second'))
    expect(numbers()).toEqual([])
    timers.runAll()
    expect(opened).toEqual([7, 7])
    events.emit(delta(8, 'first'))
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
})
