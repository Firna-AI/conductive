import type { SessionWakeUpsResponse } from '../../shared/generated/SessionWakeUpsResponse'
import type { WakeUp } from '../../shared/generated/WakeUp'
import type { StreamEnvelope } from '../api/read-workspace'

/** A wake-up that an event set, with its session and the number of the event. */
interface SetWakeUp {
  sessionId: string
  wakeUp: WakeUp
  number: number
}

/**
 * The pending wake-ups of the sessions of the workspace, as this tab knows
 * them, by ID. The newest read of each session gives its pending wake-ups
 * at the event number of the read. The events give each wake-up that an
 * agent set, and each one that fired or ended. A wake-up that fired or
 * ended never waits again, so the order in which the events and the reads
 * arrive changes nothing, as `pendingWakeUps` says.
 */
export interface WakeUpsState {
  /** The newest read of the pending wake-ups of each session, by its ID. */
  reads: Readonly<Record<string, SessionWakeUpsResponse>>
  /** Each wake-up that an event set, by its ID. */
  set: Readonly<Record<string, SetWakeUp>>
  /** The IDs of the wake-ups that fired or ended. */
  over: Readonly<Record<string, true>>
  /** The IDs of the wake-ups whose Cancel of this tab waits for its reply. */
  cancels: Readonly<Record<string, true>>
}

export const initialWakeUps: WakeUpsState = {
  reads: {},
  set: {},
  over: {},
  cancels: {},
}

/**
 * The state after the wake-up events of one batch, such as a page of the
 * history or a live event. A repeat of an event changes nothing. A batch
 * without a wake-up event gives the same state.
 */
export function withWakeUpEvents(
  state: WakeUpsState,
  envelopes: readonly StreamEnvelope[],
): WakeUpsState {
  let next = state
  for (const { eventNumber: number, event } of envelopes) {
    switch (event?.type) {
      case 'session.wake-up-scheduled': {
        const { sessionId, wakeUp } = event
        const known = next.set[wakeUp.id]
        if (known && known.number <= number) break
        next = {
          ...next,
          set: { ...next.set, [wakeUp.id]: { sessionId, wakeUp, number } },
        }
        break
      }
      case 'session.wake-up-fired':
      case 'session.wake-up-ended':
        next = withWakeUpOver(next, event.wakeUpId)
        break
    }
  }
  return next
}

/**
 * The state after a read of the pending wake-ups of a session. A read with
 * an older event number than the one that the state keeps changes nothing.
 */
export function withWakeUpRead(
  state: WakeUpsState,
  sessionId: string,
  read: SessionWakeUpsResponse,
): WakeUpsState {
  const known = state.reads[sessionId]
  if (known && known.eventNumber > read.eventNumber) return state
  return { ...state, reads: { ...state.reads, [sessionId]: read } }
}

/** The state after a wake-up fired or ended, as an event or a reply says. */
export function withWakeUpOver(
  state: WakeUpsState,
  wakeUpId: string,
): WakeUpsState {
  if (Object.hasOwn(state.over, wakeUpId)) return state
  return { ...state, over: { ...state.over, [wakeUpId]: true } }
}

/** Marks or clears the Cancel of this tab that waits for its reply. */
export function withCancel(
  state: WakeUpsState,
  wakeUpId: string,
  waits: boolean,
): WakeUpsState {
  const cancels = Object.fromEntries(
    Object.entries(state.cancels).filter(([id]) => id !== wakeUpId),
  )
  return {
    ...state,
    cancels: waits ? { ...cancels, [wakeUpId]: true } : cancels,
  }
}

/**
 * The pending wake-ups of a session, the soonest first. The newest read
 * gives the ones that waited at its event number. An event after that
 * number adds a wake-up that an agent set later. Without a read, each
 * wake-up that an event set counts. A wake-up that fired or ended counts
 * in no case, also when the read is older than its end. Two wake-ups at the
 * same time keep the order of the read, then of their events.
 */
export function pendingWakeUps(
  state: WakeUpsState,
  sessionId: string,
): WakeUp[] {
  const read = Object.hasOwn(state.reads, sessionId)
    ? state.reads[sessionId]
    : null
  const pending = new Map<string, WakeUp>()
  for (const wakeUp of read?.wakeUps ?? []) pending.set(wakeUp.id, wakeUp)
  const later = Object.values(state.set)
    .filter(
      (entry) =>
        entry.sessionId === sessionId &&
        (read === null || entry.number > read.eventNumber),
    )
    .sort((left, right) => left.number - right.number)
  for (const { wakeUp } of later) {
    if (!pending.has(wakeUp.id)) pending.set(wakeUp.id, wakeUp)
  }
  return [...pending.values()]
    .filter((wakeUp) => !Object.hasOwn(state.over, wakeUp.id))
    .sort((left, right) => left.at - right.at)
}
