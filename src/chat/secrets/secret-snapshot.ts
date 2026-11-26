import type {
  SecretRequest,
  SecretWorkspaceEvent,
} from '../../shared/secret-requests'
import type { StreamEnvelope } from '../api/read-workspace'

type RunEvent = Extract<SecretWorkspaceEvent, { type: 'secrets.run' }>
type NoticeEvent = Extract<SecretWorkspaceEvent, { type: 'secrets.notice' }>

/**
 * A request as the chat knows it: its shown state, the newest and the first
 * event numbers of the request, and whether the shown state came from a
 * reply, such as of an answer or of the read of the requests, which no
 * event gave yet. The first number orders requests that were made at the
 * same time.
 */
interface KnownRequest {
  request: SecretRequest
  number: number | null
  firstNumber: number | null
  replied: boolean
}

/** An allowed run or a late-answer line, with the number and time of its event. */
interface KnownEvent<Event> {
  event: Event
  number: number
  occurredAt: number
}

/** The answer of this window that runs, by request ID. */
export type AnswerKind = 'deny' | 'allow' | 'values'

/**
 * The secret requests of the workspace, its allowed runs, and the lines of
 * late answers, as the events of the workspace give them, by ID. A line
 * keys on the ID of its request.
 */
export interface SecretsSnapshot {
  requests: Readonly<Record<string, KnownRequest>>
  runs: Readonly<Record<string, KnownEvent<RunEvent>>>
  notices: Readonly<Record<string, KnownEvent<NoticeEvent>>>
  answers: Readonly<Record<string, AnswerKind>>
}

export const initialSecrets: SecretsSnapshot = {
  requests: {},
  runs: {},
  notices: {},
  answers: {},
}

/**
 * The state of a request after one of its events. Between events, the state
 * of the newest event number shows, as the contract says, whatever its time.
 * A reply has no event number, so an event replaces it only with the same or
 * a newer `updatedAt`: a late event then cannot take an answer back. An
 * older event only lowers the first number.
 */
function withRequestEvent(
  secrets: SecretsSnapshot,
  request: SecretRequest,
  number: number,
): SecretsSnapshot {
  const known = secrets.requests[request.id]
  const newer =
    known === undefined ||
    (known.replied
      ? request.updatedAt >= known.request.updatedAt
      : number >= (known.number ?? number))
  const next: KnownRequest = {
    request: newer ? request : known.request,
    number: Math.max(known?.number ?? number, number),
    firstNumber: Math.min(known?.firstNumber ?? number, number),
    replied: newer ? false : known.replied,
  }
  return { ...secrets, requests: { ...secrets.requests, [request.id]: next } }
}

/**
 * A state of a request from a reply, such as the answer of this window. It
 * shows when it is newer than the shown state, by `updatedAt`. Otherwise
 * the event of the answer shows it, by its event number.
 */
export function withRequestReply(
  secrets: SecretsSnapshot,
  request: SecretRequest,
): SecretsSnapshot {
  const known = secrets.requests[request.id]
  if (known && known.request.updatedAt >= request.updatedAt) return secrets
  const next: KnownRequest = {
    request,
    number: known?.number ?? null,
    firstNumber: known?.firstNumber ?? null,
    replied: true,
  }
  return { ...secrets, requests: { ...secrets.requests, [request.id]: next } }
}

/**
 * The requests of a read of every request of the workspace. A read has no
 * event number, so each of its states shows as a reply does: only when it
 * is newer than the shown state, by `updatedAt`. So a read that an event
 * overtook never takes back the newer state of that event. The read adds
 * each open request of any session, and the newer state of each request
 * that the chat knows. An ended request that the chat does not know waits
 * for the history of its session, which places it in its turn.
 */
export function withRequestRead(
  secrets: SecretsSnapshot,
  requests: readonly SecretRequest[],
): SecretsSnapshot {
  return requests.reduce(
    (next, request) =>
      isOpen(request) || Object.hasOwn(next.requests, request.id)
        ? withRequestReply(next, request)
        : next,
    secrets,
  )
}

/** The snapshot after the secret events of one batch, in their order. */
export function withSecretEvents(
  secrets: SecretsSnapshot,
  envelopes: readonly StreamEnvelope[],
): SecretsSnapshot {
  let next = secrets
  for (const { eventNumber: number, occurredAt, event } of envelopes) {
    switch (event?.type) {
      case 'secrets.request.updated':
        next = withRequestEvent(next, event.request, number)
        break
      case 'secrets.run':
        next = {
          ...next,
          runs: { ...next.runs, [event.id]: { event, number, occurredAt } },
        }
        break
      case 'secrets.notice':
        next = {
          ...next,
          notices: {
            ...next.notices,
            [event.requestId]: { event, number, occurredAt },
          },
        }
        break
    }
  }
  return next
}

/** A member can answer a request while it waits, also after its call ended. */
export function isOpen(request: SecretRequest): boolean {
  return request.state === 'waiting' || request.state === 'late'
}

/** Marks or clears the answer of this window for a request. */
export function withAnswer(
  secrets: SecretsSnapshot,
  requestId: string,
  answer: AnswerKind | null,
): SecretsSnapshot {
  const answers = Object.fromEntries(
    Object.entries(secrets.answers).filter(([id]) => id !== requestId),
  )
  return {
    ...secrets,
    answers: answer === null ? answers : { ...answers, [requestId]: answer },
  }
}
