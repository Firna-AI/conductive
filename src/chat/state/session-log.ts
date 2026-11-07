import type { ChatEvent, RunnerEventRefused } from '../../shared/chat-events'
import type { Session } from '../../shared/sessions'
import type { ChatStreamEvent, StreamEnvelope } from '../api/read-workspace'
import { emptyTranscript, foldEvent, type Transcript } from './transcript'

export interface ChatEnvelope {
  eventNumber: number
  occurredAt: number
  event: SessionEvent
}

/**
 * A chat event of one session: an event of its transcript, or a record of
 * the session, whose retry message the log keeps.
 */
export type SessionEvent =
  | Exclude<ChatEvent, { type: 'runner.event-refused' }>
  | (RunnerEventRefused & { sessionId: string })

/** The event as a session event, or null for an event of no session. */
export function asSessionEvent(
  event: ChatStreamEvent | null,
): SessionEvent | null {
  if (!event) return null
  switch (event.type) {
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

/** The newest record of a session in its log, at its place in the events. */
interface PlacedRecord {
  /** The number of its event, or of the event that the list read follows. */
  eventNumber: number
  retryMessageId: Session['retryMessageId']
}

/**
 * The stored and live events of one session, in event-number order. The
 * numbers belong to this session's log only, so a history that loads after
 * the workspace stream moved on still applies in full. Each number applies
 * once, and an older event folds the transcript again in order. The log
 * also keeps the time of the first event of each item, so a part that is
 * not an event, such as a Mac command, can take its place among them.
 *
 * The transcript names the retry message of the newest session record by
 * event number, not by arrival. So a history that loads after newer live
 * records never brings back an older Try again, or takes away a newer one.
 */
export class SessionLog {
  private readonly events: ChatEnvelope[] = []
  private readonly numbers = new Set<number>()
  private folded: Transcript = emptyTranscript
  private firstTimes: ReadonlyMap<string, number> = new Map()
  private record: PlacedRecord = { eventNumber: 0, retryMessageId: null }

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
      const { eventNumber, event } = envelope
      if (this.numbers.has(eventNumber)) continue
      this.numbers.add(eventNumber)
      if (event.type !== 'session.updated') {
        fresh.push(envelope)
      } else if (eventNumber > this.record.eventNumber) {
        const { retryMessageId } = event.session
        this.record = { eventNumber, retryMessageId }
      }
    }
    if (fresh.length > 0) this.foldFresh(fresh)
    const shown = this.showRecord()
    return shown || fresh.length > 0
  }

  /**
   * Takes the record of the session list. The chat reads the list after the
   * history that its stream follows, so the record holds after that event
   * number. A `session.updated` event up to that number never replaces it,
   * and a later one does. Says whether the transcript changed.
   */
  takeListed(
    session: Pick<Session, 'retryMessageId'>,
    afterEventNumber: number,
  ): boolean {
    if (this.record.eventNumber > afterEventNumber) return false
    const { retryMessageId } = session
    this.record = { eventNumber: afterEventNumber, retryMessageId }
    return this.showRecord()
  }

  private foldFresh(fresh: ChatEnvelope[]): void {
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
  }

  /** Shows the retry message of the newest record, and says if it changed. */
  private showRecord(): boolean {
    const { retryMessageId } = this.record
    if (this.folded.retryMessageId === retryMessageId) return false
    this.folded = { ...this.folded, retryMessageId }
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
