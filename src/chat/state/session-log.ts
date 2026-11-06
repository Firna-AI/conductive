import type { ChatEvent, RunnerEventRefused } from '../../shared/chat-events'
import type { ChatStreamEvent, StreamEnvelope } from '../api/read-workspace'
import { emptyTranscript, foldEvent, type Transcript } from './transcript'

export interface ChatEnvelope {
  eventNumber: number
  occurredAt: number
  event: SessionEvent
}

/** A chat event that belongs to one session's transcript. */
export type SessionEvent =
  | Exclude<ChatEvent, { type: 'session.updated' | 'runner.event-refused' }>
  | (RunnerEventRefused & { sessionId: string })

/** The event as a session event, or null for a workspace or session record. */
export function asSessionEvent(
  event: ChatStreamEvent | null,
): SessionEvent | null {
  if (!event) return null
  switch (event.type) {
    case 'session.updated':
    case 'workspace.updated':
    case 'workspace.title':
    case 'start.updated':
      return null
    case 'runner.event-refused':
      return event.sessionId === null
        ? null
        : { ...event, sessionId: event.sessionId }
    default:
      return event
  }
}

export function sessionOf(event: SessionEvent): string {
  return event.type === 'message.accepted'
    ? event.message.sessionId
    : event.sessionId
}

/** The chat events of one session, from a list of workspace envelopes. */
export function chatEventsOf(
  sessionId: string,
  envelopes: readonly StreamEnvelope[],
): ChatEnvelope[] {
  const events: ChatEnvelope[] = []
  for (const { eventNumber, occurredAt, event } of envelopes) {
    const sessionEvent = asSessionEvent(event)
    if (sessionEvent && sessionOf(sessionEvent) === sessionId) {
      events.push({ eventNumber, occurredAt, event: sessionEvent })
    }
  }
  return events
}

const byNumber = (left: ChatEnvelope, right: ChatEnvelope) =>
  left.eventNumber - right.eventNumber

/**
 * The stored and live events of one session, in event-number order. The
 * numbers belong to this session's log only, so a history that loads after
 * the workspace stream moved on still applies in full. Each number applies
 * once, and an older event folds the transcript again in order.
 */
export class SessionLog {
  private readonly events: ChatEnvelope[] = []
  private readonly numbers = new Set<number>()
  private folded: Transcript = emptyTranscript

  get transcript(): Transcript {
    return this.folded
  }

  /** Adds the events that are new, and says whether the transcript changed. */
  merge(envelopes: readonly ChatEnvelope[]): boolean {
    const fresh: ChatEnvelope[] = []
    for (const envelope of envelopes) {
      if (this.numbers.has(envelope.eventNumber)) continue
      this.numbers.add(envelope.eventNumber)
      fresh.push(envelope)
    }
    if (fresh.length === 0) return false
    fresh.sort(byNumber)
    const last = this.events.at(-1)?.eventNumber ?? 0
    this.events.push(...fresh)
    if (fresh[0].eventNumber > last) {
      this.folded = fold(this.folded, fresh)
    } else {
      this.events.sort(byNumber)
      this.folded = fold(emptyTranscript, this.events)
    }
    return true
  }
}

function fold(start: Transcript, events: readonly ChatEnvelope[]): Transcript {
  let transcript = start
  for (const { event, occurredAt } of events) {
    transcript = foldEvent(transcript, event, occurredAt)
  }
  return transcript
}
