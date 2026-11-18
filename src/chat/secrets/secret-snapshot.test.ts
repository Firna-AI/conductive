import { describe, expect, test } from 'vitest'
import type { SecretRequest } from '../../shared/secret-requests'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  priya,
  request,
} from '../../test-support/fixtures/secret-requests'
import type { StreamEnvelope } from '../api/read-workspace'
import {
  initialSecrets,
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
})
