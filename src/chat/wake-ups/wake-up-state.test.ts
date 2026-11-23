import { describe, expect, it } from 'vitest'
import type { WakeUp } from '../../shared/generated/WakeUp'
import type { StreamEnvelope } from '../api/read-workspace'
import {
  initialWakeUps,
  pendingWakeUps,
  withWakeUpEvents,
  withWakeUpRead,
  type WakeUpsState,
} from './wake-up-state'

const session = 'autocomplete'

function wakeUp(id: string, at: number): WakeUp {
  return { id, at, atUtc: `time ${at}`, text: `Text of ${id}` }
}

function envelope(
  eventNumber: number,
  event: StreamEnvelope['event'],
): StreamEnvelope {
  return { workspaceId: 'w', eventNumber, occurredAt: 0, event, late: false }
}

const set = (number: number, item: WakeUp, sessionId = session) =>
  envelope(number, {
    type: 'session.wake-up-scheduled',
    sessionId,
    wakeUp: item,
  })

const fired = (number: number, id: string) =>
  envelope(number, {
    type: 'session.wake-up-fired',
    sessionId: session,
    wakeUpId: id,
    messageId: `session-wake-up:${id}`,
    turnId: 'turn-3',
    text: `Text of ${id}`,
  })

const ended = (number: number, id: string, at: number) =>
  envelope(number, {
    type: 'session.wake-up-ended',
    sessionId: session,
    wakeUpId: id,
    at,
    outcome: {
      kind: 'cancelled',
      source: { kind: 'member', memberId: 'cal' },
    },
  })

const ids = (state: WakeUpsState, sessionId = session) =>
  pendingWakeUps(state, sessionId).map((item) => item.id)

describe('the pending wake-ups of a session', () => {
  it('shows each wake-up that an event set until it fires or ends, the soonest first, in its own session', () => {
    const state = withWakeUpEvents(initialWakeUps, [
      set(1, wakeUp('monday', 300)),
      set(2, wakeUp('evening', 100)),
      set(3, wakeUp('tomorrow', 200)),
      set(4, wakeUp('other', 50), 'debounce'),
    ])
    expect(ids(state)).toEqual(['evening', 'tomorrow', 'monday'])
    expect(ids(state, 'debounce')).toEqual(['other'])

    const later = withWakeUpEvents(state, [
      fired(5, 'evening'),
      ended(6, 'monday', 300),
    ])
    expect(ids(later)).toEqual(['tomorrow'])
  })

  it('takes the wake-ups of a read at its event number and the ones that events set after it, in any order of arrival', () => {
    // The read at event 10 lists the wake-up of an older page, `old`. The
    // wake-up of event 8 ended by event 10, though this tab saw no end.
    const read = { eventNumber: 10, wakeUps: [wakeUp('old', 500)] }
    const events = [
      set(8, wakeUp('ended-unseen', 100)),
      set(11, wakeUp('new', 200)),
    ]
    const readFirst = withWakeUpEvents(
      withWakeUpRead(initialWakeUps, session, read),
      events,
    )
    const eventsFirst = withWakeUpRead(
      withWakeUpEvents(initialWakeUps, events),
      session,
      read,
    )
    expect([ids(readFirst), ids(eventsFirst)]).toEqual([
      ['new', 'old'],
      ['new', 'old'],
    ])

    // An end after the read, also of a wake-up that only the read gives.
    const end = [ended(12, 'old', 500)]
    expect([
      ids(withWakeUpEvents(readFirst, end)),
      ids(withWakeUpEvents(eventsFirst, end)),
    ]).toEqual([['new'], ['new']])
  })

  it('shows a wake-up once when its event comes again, and never again after its end, also when an older page brings its set event later', () => {
    const first = withWakeUpEvents(initialWakeUps, [
      set(4, wakeUp('checks', 100)),
    ])
    const repeated = withWakeUpEvents(first, [set(4, wakeUp('checks', 100))])
    expect(ids(repeated)).toEqual(['checks'])

    // The live end arrives before the earlier page with the set event.
    const endFirst = withWakeUpEvents(initialWakeUps, [fired(9, 'checks')])
    const page = withWakeUpEvents(endFirst, [set(4, wakeUp('checks', 100))])
    expect(ids(page)).toEqual([])
    // A read from before the end does not bring it back.
    const staleRead = { eventNumber: 5, wakeUps: [wakeUp('checks', 100)] }
    expect(ids(withWakeUpRead(page, session, staleRead))).toEqual([])
  })

  it('keeps the newest read of a session when an older read replies late', () => {
    const newer = { eventNumber: 20, wakeUps: [wakeUp('newer', 100)] }
    const older = { eventNumber: 12, wakeUps: [wakeUp('older', 100)] }
    const state = withWakeUpRead(
      withWakeUpRead(initialWakeUps, session, newer),
      session,
      older,
    )
    expect(ids(state)).toEqual(['newer'])
  })
})
