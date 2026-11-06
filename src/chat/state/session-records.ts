import type { Session } from '../../shared/sessions'
import type { ChatContext } from './context'
import { placeSession } from './sessions'

/**
 * The local order of session records. A record carries no order of the
 * server, so the chat counts its own versions for each session. Each action
 * on a session and each record from the stream starts a new version. A
 * reply or a rollback applies only while the version of its action is the
 * newest, so a newer action or stream record always wins over it. The stream
 * is ordered, so its records always apply.
 */

/** The current version of a session. A session that nothing changed has 0. */
export function versionOf(context: ChatContext, sessionId: string): number {
  return context.versions.get(sessionId) ?? 0
}

/** Starts a change of a session, and gives the version of the change. */
export function beginChange(context: ChatContext, sessionId: string): number {
  const version = versionOf(context, sessionId) + 1
  context.versions.set(sessionId, version)
  return version
}

/** Shows the edit of an action at once, as a new version of the record. */
export function placeEdit(context: ChatContext, record: Session): number {
  const version = beginChange(context, record.id)
  context.store.update((snapshot) => placeSession(snapshot, record))
  return version
}

/**
 * Applies the record of a reply or a rollback when no newer change came
 * after its action, and says whether it applied. The steps after an action,
 * such as a view save or the focus, do not depend on the answer.
 */
export function placeIfNewest(
  context: ChatContext,
  record: Session,
  version: number,
): boolean {
  if (!context.live() || versionOf(context, record.id) !== version) {
    return false
  }
  context.store.update((snapshot) => placeSession(snapshot, record))
  return true
}
