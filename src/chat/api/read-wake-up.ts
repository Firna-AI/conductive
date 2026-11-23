import type { SessionCancelWakeUpResponse } from '../../shared/generated/SessionCancelWakeUpResponse'
import type { SessionWakeUpEvent } from '../../shared/generated/SessionWakeUpEvent'
import type { SessionWakeUpsResponse } from '../../shared/generated/SessionWakeUpsResponse'
import type { WakeUp } from '../../shared/generated/WakeUp'
import type { WakeUpCancelSource } from '../../shared/generated/WakeUpCancelSource'
import type { WakeUpCancelState } from '../../shared/generated/WakeUpCancelState'
import type { WakeUpEnd } from '../../shared/generated/WakeUpEnd'
import type { WakeUpFailure } from '../../shared/generated/WakeUpFailure'
import {
  count,
  list,
  nullable,
  oneOf,
  record,
  safeCount,
  text,
  UnreadableResponse,
} from './json'
import { readAgent, readSessionLogin } from './read-chat'

const eventType = oneOf<SessionWakeUpEvent['type']>({
  'session.wake-up-scheduled': true,
  'session.wake-up-fired': true,
  'session.wake-up-ended': true,
})

function timestamp(value: unknown): number {
  const at = count(value)
  if (!Number.isSafeInteger(at)) throw new UnreadableResponse('wake-up time')
  return at
}

function readWakeUp(value: unknown): WakeUp {
  const source = record(value, 'wake-up')
  return {
    id: text(source.id),
    at: timestamp(source.at),
    atUtc: text(source.atUtc),
    text: text(source.text),
  }
}

const cancelSource = oneOf<WakeUpCancelSource['kind']>({
  member: true,
  session: true,
})

function readCancelSource(value: unknown): WakeUpCancelSource {
  const source = record(value, 'cancel source')
  return cancelSource(source.kind) === 'member'
    ? { kind: 'member', memberId: text(source.memberId) }
    : {
        kind: 'session',
        workspaceId: text(source.workspaceId),
        sessionId: text(source.sessionId),
      }
}

const failure = oneOf<WakeUpFailure['kind']>({
  archived: true,
  'session-closed': true,
  'sender-unavailable': true,
  'login-not-shared': true,
  'login-unavailable': true,
})

function readFailure(value: unknown): WakeUpFailure {
  const source = record(value, 'wake-up failure')
  const kind = failure(source.kind)
  return kind === 'login-unavailable'
    ? {
        kind,
        agent: readAgent(source.agent),
        owner: nullable(readSessionLogin)(source.owner),
      }
    : { kind }
}

const endKind = oneOf<WakeUpEnd['kind']>({
  cancelled: true,
  'could-not-start': true,
})

function readEnd(value: unknown): WakeUpEnd {
  const source = record(value, 'wake-up end')
  const kind = endKind(source.kind)
  return kind === 'cancelled'
    ? { kind, source: readCancelSource(source.source) }
    : { kind, reason: readFailure(source.reason) }
}

export function readWakeUpEvent(
  source: Record<string, unknown>,
): SessionWakeUpEvent {
  const type = eventType(source.type)
  const sessionId = text(source.sessionId)
  if (type === 'session.wake-up-scheduled')
    return { type, sessionId, wakeUp: readWakeUp(source.wakeUp) }
  const wakeUpId = text(source.wakeUpId)
  return type === 'session.wake-up-fired'
    ? {
        type,
        sessionId,
        wakeUpId,
        messageId: text(source.messageId),
        turnId: text(source.turnId),
        text: text(source.text),
      }
    : {
        type,
        sessionId,
        wakeUpId,
        at: timestamp(source.at),
        outcome: readEnd(source.outcome),
      }
}

/** @public Read the pending snapshot at its workspace event number. */
export function readSessionWakeUps(value: unknown): SessionWakeUpsResponse {
  const source = record(value, 'pending wake-ups')
  return {
    eventNumber: safeCount(source.eventNumber),
    wakeUps: list(readWakeUp)(source.wakeUps),
  }
}

const cancelState = oneOf<WakeUpCancelState>({
  cancelled: true,
  'already-fired': true,
  'already-ended': true,
})

/** @public Read the result of a cancel in chat. */
export function readSessionWakeUpCancel(
  value: unknown,
): SessionCancelWakeUpResponse {
  const source = record(value, 'wake-up cancel')
  return {
    eventNumber: safeCount(source.eventNumber),
    wakeUpId: text(source.wakeUpId),
    state: cancelState(source.state),
  }
}
