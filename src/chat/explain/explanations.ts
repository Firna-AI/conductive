import type { Session } from '../../shared/generated/Session'
import type { SessionAnchor } from '../../shared/generated/SessionAnchor'
import { nameLabel } from '../../shared/name-label'
import { requestsOf } from '../device/device-snapshot'
import { isRunning, type ChatSnapshot } from '../state/chat-snapshot'
import type { ExplainMarkState } from '../../ui/components/explain/explainCopy'

/** An explanation that the chat of its parent session marks. */
export interface Explanation {
  id: string
  /** The title of its session, which names it in its mark and its menu. */
  title: string
  anchor: SessionAnchor
  state: ExplainMarkState
}

/**
 * A request of the agent of the session waits for a member: a Mac command
 * or a secret request.
 */
export function waitsForMember(
  snapshot: ChatSnapshot,
  sessionId: string,
): boolean {
  const commands = requestsOf(snapshot.devices, sessionId)
  if (commands.some((request) => request.state === 'waiting')) return true
  return Object.values(snapshot.secrets.requests).some(
    ({ request }) =>
      request.sessionId === sessionId && request.state === 'waiting',
  )
}

/**
 * The state that the mark of an explanation shows. A request that waits for
 * a member comes first. A turn runs while the record names it, also while
 * its message waits for the cloud computer, or while the chat shows it. A
 * newest turn that failed names its message for Try again. A read-only
 * workspace runs no turn, so its marks show only an ended turn or a failure.
 */
function stateOf(
  snapshot: ChatSnapshot,
  session: Session,
  readOnly: boolean,
): ExplainMarkState {
  if (!readOnly) {
    if (waitsForMember(snapshot, session.id)) return 'waiting'
    if (session.activeTurnId !== null || isRunning(snapshot, session.id))
      return 'running'
  }
  return session.retryMessageId === null ? 'idle' : 'failed'
}

/**
 * The explanations whose anchors name the session, open or closed, in the
 * order that they started. A closed explanation keeps its mark.
 */
export function explanationsOf(
  snapshot: ChatSnapshot,
  parentId: string,
  readOnly: boolean,
): Explanation[] {
  return [...snapshot.sessions, ...snapshot.history]
    .filter((session) => session.anchor?.parentSessionId === parentId)
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((session) =>
      session.anchor
        ? [
            {
              id: session.id,
              title: nameLabel(session.title),
              anchor: session.anchor,
              state: stateOf(snapshot, session, readOnly),
            },
          ]
        : [],
    )
}

/** The explanations of each message, in the order that they started. */
export function byMessage(
  explanations: readonly Explanation[],
): ReadonlyMap<string, readonly Explanation[]> {
  const marks = new Map<string, Explanation[]>()
  for (const explanation of explanations) {
    const { messageId } = explanation.anchor
    marks.set(messageId, [...(marks.get(messageId) ?? []), explanation])
  }
  return marks
}
