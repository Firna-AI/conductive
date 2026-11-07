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
 * once, and an older event folds the transcript again in order. The log
 * also keeps the time of the first event of each item, so a part that is
 * not an event, such as a Mac command, can take its place among them.
 */
export class SessionLog {
  private readonly events: ChatEnvelope[] = []
  private readonly numbers = new Set<number>()
  private folded: Transcript = emptyTranscript
  private firstTimes: ReadonlyMap<string, number> = new Map()

  get transcript(): Transcript {
    return this.folded
  }

  /** The time of the first event of each item of the transcript, by its ID. */
  get times(): ReadonlyMap<string, number> {
    return this.firstTimes
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
    const appends = fresh[0].eventNumber > last
    if (!appends) this.events.sort(byNumber)
    const folded = appends
      ? fold(this.folded, fresh, this.firstTimes)
      : fold(emptyTranscript, this.events, new Map())
    this.folded = folded.transcript
    this.firstTimes = folded.times
    return true
  }
}

/**
 * Folds events in order, and notes the time of each item that an event
 * adds. The map of times is copied only when an event adds an item.
 */
function fold(
  start: Transcript,
  events: readonly ChatEnvelope[],
  known: ReadonlyMap<string, number>,
): { transcript: Transcript; times: ReadonlyMap<string, number> } {
  let transcript = start
  let times = known
  let copy: Map<string, number> | null = null
  for (const { event, occurredAt } of events) {
    const next = foldEvent(transcript, event, occurredAt)
    if (next.items.length > transcript.items.length) {
      for (const item of next.items) {
        if (times.has(item.id)) continue
        copy ??= new Map(times)
        copy.set(item.id, occurredAt)
        times = copy
      }
    }
    transcript = next
  }
  return { transcript, times }
}
