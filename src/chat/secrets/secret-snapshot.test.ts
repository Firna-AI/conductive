import { describe, expect, test } from 'vitest'
import type { SecretRequest } from '../../shared/secret-requests'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  late,
  priya,
  request,
} from '../../test-support/fixtures/secret-requests'
import type { StreamEnvelope } from '../api/read-workspace'
import {
  initialSecrets,
  withRequestRead,
  withRequestReply,
  withSecretEvents,
} from './secret-snapshot'

/** The event of a state of a request, with its number. */
function envelope(item: SecretRequest, eventNumber: number): StreamEnvelope {
  return {
    workspaceId: FAKE_IDS.workspace,
    eventNumber,
    occurredAt: item.updatedAt,
    event: {
      type: 'secrets.request.updated',
      sessionId: FAKE_IDS.session,
      request: item,
    },
    late: false,
  }
}

const asked = request('asked', asks.database, FAKE_TIME)
const lateState = {
  ...asked,
  state: 'late' as const,
  late: true,
  updatedAt: FAKE_TIME + 90_000,
}
const denied = {
  ...lateState,
  state: 'denied' as const,
  answeredBy: priya,
  updatedAt: FAKE_TIME + 120_000,
}

describe('the secret requests of the chat', () => {
  test('keep the state of the newest event number, also when its time is older, and the first number of the request from any older event', () => {
    // The stream gives the late state before an older page of the history
    // gives the first state.
    const backwards = withSecretEvents(
      withSecretEvents(initialSecrets, [envelope(lateState, 40)]),
      [envelope(asked, 12)],
    )
    const forwards = withSecretEvents(initialSecrets, [
      envelope(asked, 12),
      envelope(lateState, 40),
    ])
    // A clock gave the answer an older time than the late state.
    const early = { ...denied, updatedAt: FAKE_TIME + 1 }
    const clock = withSecretEvents(forwards, [envelope(early, 41)])
    const known = {
      request: lateState,
      number: 40,
      firstNumber: 12,
      replied: false,
    }
    expect({
      backwards: backwards.requests.asked,
      forwards: forwards.requests.asked,
      clock: clock.requests.asked?.request,
    }).toEqual({ backwards: known, forwards: known, clock: early })
  })

  test('show the reply of an answer until an event of the same or a newer state arrives, and never an older reply', () => {
    const shown = withSecretEvents(initialSecrets, [envelope(lateState, 40)])
    const answered = withRequestReply(shown, denied)
    const older = withRequestReply(answered, asked)
    const stale = withSecretEvents(answered, [envelope(lateState, 41)])
    const confirmed = withSecretEvents(answered, [envelope(denied, 42)])
    expect({
      answered: answered.requests.asked?.request.state,
      older: older.requests.asked?.request.state,
      stale: stale.requests.asked?.request.state,
      confirmed: confirmed.requests.asked,
    }).toEqual({
      answered: 'denied',
      older: 'denied',
      stale: 'denied',
      confirmed: {
        request: denied,
        number: 42,
        firstNumber: 40,
        replied: false,
      },
    })
  })

  test('take from a read each open request and each newer state of a known request, and never an older state or an ended request that the chat does not know', () => {
    // Priya denied this request, and the chat has the event of her answer.
    const answered = request('answered', asks.vercel, FAKE_TIME)
    const answeredLate = { ...answered, ...late(FAKE_TIME + 90_000) }
    const answeredDenied = {
      ...answeredLate,
      state: 'denied' as const,
      answeredBy: priya,
      updatedAt: FAKE_TIME + 120_000,
    }
    // A late request of another session, which no event of the chat holds.
    const other = request('other', asks.mapbox, FAKE_TIME, {
      ...late(FAKE_TIME + 90_000),
      sessionId: 'debounce',
    })
    // An ended request that no event of the chat holds.
    const ended = request('ended', asks.places, FAKE_TIME, {
      state: 'denied',
      answeredBy: priya,
      updatedAt: FAKE_TIME + 120_000,
    })
    const known = withSecretEvents(initialSecrets, [
      envelope(asked, 12),
      envelope(answeredDenied, 42),
    ])
    // The read has the newer, ended state of `asked`, and the older state
    // of `answered`.
    const read = withRequestRead(known, [denied, answeredLate, other, ended])
    expect({
      asked: read.requests.asked,
      answered: read.requests.answered,
      other: read.requests.other,
      ended: read.requests.ended,
    }).toEqual({
      asked: { request: denied, number: 12, firstNumber: 12, replied: true },
      answered: {
        request: answeredDenied,
        number: 42,
        firstNumber: 42,
        replied: false,
      },
      other: { request: other, number: null, firstNumber: null, replied: true },
      ended: undefined,
    })
  })
})
