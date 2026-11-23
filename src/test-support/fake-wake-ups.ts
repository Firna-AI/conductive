import type { SessionCancelWakeUpResponse } from '../shared/generated/SessionCancelWakeUpResponse'
import type { SessionWakeUpsResponse } from '../shared/generated/SessionWakeUpsResponse'
import type { WakeUp } from '../shared/generated/WakeUp'
import type { WakeUpCancelState } from '../shared/generated/WakeUpCancelState'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from '../shared/events'
import { sessionWakeUpPaths } from '../shared/wake-up-paths'

/** The events of a fake, which its wake-up routes read and add to. */
export interface FakeWakeUpEvents {
  history(): {
    events: readonly WorkspaceEventEnvelope[]
    throughEventNumber: number
  }
  /** Stores a new event of a workspace and sends it to each open stream. */
  emit(workspaceId: string, event: WorkspaceEvent): void
}

/** Where a wake-up stands, as its events say. */
interface KnownWakeUp {
  wakeUp: WakeUp
  stage: 'pending' | 'fired' | 'ended'
}

/** The wake-ups of one session, as the Worker keeps them, in the order set. */
function wakeUpsOf(
  events: readonly WorkspaceEventEnvelope[],
  workspaceId: string,
  sessionId: string,
): Map<string, KnownWakeUp> {
  const known = new Map<string, KnownWakeUp>()
  for (const envelope of events) {
    const { event } = envelope
    if (envelope.workspaceId !== workspaceId) continue
    if (!('sessionId' in event) || event.sessionId !== sessionId) continue
    if (event.type === 'session.wake-up-scheduled') {
      const { wakeUp } = event
      if (!known.has(wakeUp.id))
        known.set(wakeUp.id, { wakeUp, stage: 'pending' })
    } else if (event.type === 'session.wake-up-fired') {
      const entry = known.get(event.wakeUpId)
      if (entry) entry.stage = 'fired'
    } else if (event.type === 'session.wake-up-ended') {
      const entry = known.get(event.wakeUpId)
      if (entry) entry.stage = 'ended'
    }
  }
  return known
}

/** The pending wake-ups of a session, the soonest first, as the Worker lists them. */
export function fakePendingWakeUps(
  events: readonly WorkspaceEventEnvelope[],
  workspaceId: string,
  sessionId: string,
): WakeUp[] {
  return [...wakeUpsOf(events, workspaceId, sessionId).values()]
    .filter((entry) => entry.stage === 'pending')
    .map((entry) => entry.wakeUp)
    .sort((left, right) => left.at - right.at)
}

/**
 * The pattern of a route of the shared builders, with each named ID as a
 * part of the path that the pattern captures in order.
 */
function routePattern(path: string, names: readonly string[]): RegExp {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `^${escaped.replace(new RegExp(names.join('|'), 'g'), '([^/]+)')}$`,
  )
}

const names = ['ORG', 'WORKSPACE', 'SESSION', 'WAKEUP'] as const
const listRoute = routePattern(
  sessionWakeUpPaths.list('ORG', 'WORKSPACE', 'SESSION'),
  names,
)
const cancelRoute = routePattern(
  sessionWakeUpPaths.cancel('ORG', 'WORKSPACE', 'SESSION', 'WAKEUP'),
  names,
)

const stageReply: Readonly<Record<KnownWakeUp['stage'], WakeUpCancelState>> = {
  pending: 'cancelled',
  fired: 'already-fired',
  ended: 'already-ended',
}

/**
 * Answers the wake-up routes of the chat from the events of a fake, as the
 * Worker does: the pending wake-ups of a session at the newest event
 * number, and the Cancel of `memberId`, which adds the event of the end of
 * a pending wake-up. A wake-up of no event of the session gets the 404 of
 * the Worker. Null for any other request.
 */
export function fakeWakeUpRoute(
  request: Request,
  events: FakeWakeUpEvents,
  memberId: () => string,
): Response | null {
  const { pathname } = new URL(request.url)
  const list = request.method === 'GET' ? listRoute.exec(pathname) : null
  if (list) {
    const [, , workspaceId, sessionId] = list.map(decodeURIComponent)
    const history = events.history()
    return Response.json({
      eventNumber: history.throughEventNumber,
      wakeUps: fakePendingWakeUps(history.events, workspaceId, sessionId),
    } satisfies SessionWakeUpsResponse)
  }
  const cancel = request.method === 'POST' ? cancelRoute.exec(pathname) : null
  if (!cancel) return null
  const [, , workspaceId, sessionId, wakeUpId] = cancel.map(decodeURIComponent)
  const known = wakeUpsOf(events.history().events, workspaceId, sessionId).get(
    wakeUpId,
  )
  if (!known) {
    return Response.json(
      {
        error: {
          code: 'wake_up_not_found',
          message: 'The wake-up is not available.',
        },
      },
      { status: 404 },
    )
  }
  if (known.stage === 'pending') {
    events.emit(workspaceId, {
      type: 'session.wake-up-ended',
      sessionId,
      wakeUpId,
      at: known.wakeUp.at,
      outcome: {
        kind: 'cancelled',
        source: { kind: 'member', memberId: memberId() },
      },
    })
  }
  return Response.json({
    eventNumber: events.history().throughEventNumber,
    wakeUpId,
    state: stageReply[known.stage],
  } satisfies SessionCancelWakeUpResponse)
}
