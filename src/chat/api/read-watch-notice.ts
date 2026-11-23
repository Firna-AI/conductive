import type { SessionWatchEndState } from '../../shared/generated/SessionWatchEndState'
import type { SessionWatchNotice } from '../../shared/generated/SessionWatchNotice'
import { oneOf, record, text } from './json'

const readEnd = oneOf<SessionWatchEndState>({
  finished: true,
  failed: true,
  stopped: true,
})

/**
 * The wake of a watch, which only the Worker writes. A notice without a
 * known end is unreadable, so the chat shows no line for it. A reason that
 * this app does not know reads as none, as the end reason of a turn does,
 * so the line still shows.
 */
export function readWatchNotice(
  source: Record<string, unknown>,
): SessionWatchNotice {
  const session = record(source.watchedSession, 'watched session')
  return {
    type: 'session.watch-notice',
    watchId: text(source.watchId),
    messageId: text(source.messageId),
    sessionId: text(source.sessionId),
    turnId: text(source.turnId),
    watchedWorkspaceId: text(source.watchedWorkspaceId),
    watchedSession: { id: text(session.id), link: text(session.link) },
    watchedTurnId: text(source.watchedTurnId),
    state: readEnd(source.state),
    reason: source.reason === 'background_work_limit' ? source.reason : null,
  }
}
