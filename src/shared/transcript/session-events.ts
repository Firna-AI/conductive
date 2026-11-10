import type { ChatEvent, RunnerEventRefused } from '../chat-events'
import type { WorkspaceEvent } from '../events'

/**
 * An envelope from stored history or the parsed browser stream. Non-chat
 * events need only their type, so their other fields stay with their owner.
 */
export interface SessionEnvelopeInput {
  eventNumber: number
  occurredAt: number
  event: ChatEvent | Pick<Exclude<WorkspaceEvent, ChatEvent>, 'type'> | null
  late?: boolean
}

export interface ChatEnvelope {
  eventNumber: number
  occurredAt: number
  event: SessionEvent
  /** The workspace marked an agent event of a turn that had ended. */
  late: boolean
}

/** A transcript event or a session record that belongs to one session. */
export type SessionEvent =
  | Exclude<ChatEvent, { type: 'runner.event-refused' }>
  | (RunnerEventRefused & { sessionId: string })

/** The chat event as a session event, or null for an event of no session. */
export function asSessionEvent(
  event: SessionEnvelopeInput['event'],
): SessionEvent | null {
  if (!event) return null
  switch (event.type) {
    case 'runner.event-refused':
      return event.sessionId === null
        ? null
        : { ...event, sessionId: event.sessionId }
    case 'message.accepted':
    case 'message.sent':
    case 'session.updated':
    case 'turn.stop-requested':
    case 'turn.started':
    case 'turn.thinking':
    case 'assistant.delta':
    case 'assistant.completed':
    case 'tool.updated':
    case 'turn.completed':
    case 'turn.failed':
      return event
    default:
      return null
  }
}

export function sessionOf(event: SessionEvent): string {
  switch (event.type) {
    case 'message.accepted':
      return event.message.sessionId
    case 'session.updated':
      return event.session.id
    default:
      return event.sessionId
  }
}

/** The chat events and records of one session, from workspace envelopes. */
export function chatEventsOf(
  sessionId: string,
  envelopes: readonly SessionEnvelopeInput[],
): ChatEnvelope[] {
  const events: ChatEnvelope[] = []
  for (const { eventNumber, occurredAt, event, late } of envelopes) {
    const sessionEvent = asSessionEvent(event)
    if (sessionEvent && sessionOf(sessionEvent) === sessionId) {
      events.push({
        eventNumber,
        occurredAt,
        event: sessionEvent,
        late: late === true,
      })
    }
  }
  return events
}
