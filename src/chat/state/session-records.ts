import type { Session } from '../../shared/sessions'
import type { WorkspaceResponse } from '../../shared/workspaces'
import type { ChatContext } from './context'
import { placeSession } from './sessions'

/**
 * The local order of records that a reply and the stream both write: each
 * session record, and the workspace record with its start steps. A record
 * carries no order of the server, so the chat counts its own versions for
 * each record. Each action on a record and each stream event that changes
 * it starts a new version. A reply or a rollback applies only while the
 * version of its action is the newest, so a newer action or stream event
 * always wins over it. The stream is ordered, so its events always apply.
 */

/** The key of the workspace record. A symbol, so no session ID can equal it. */
export const WORKSPACE_RECORD: unique symbol = Symbol('workspace record')

/** A session ID, or the key of the workspace record. */
export type RecordKey = string | typeof WORKSPACE_RECORD

/** The current version of a record. A record that nothing changed has 0. */
export function versionOf(context: ChatContext, key: RecordKey): number {
  return context.versions.get(key) ?? 0
}

/** Starts a change of a record, and gives the version of the change. */
export function beginChange(context: ChatContext, key: RecordKey): number {
  const version = versionOf(context, key) + 1
  context.versions.set(key, version)
  return version
}

/**
 * Applies the workspace record and the start steps of a reply when no newer
 * change came after its action, and says whether it applied.
 */
export function applyWorkspaceIfNewest(
  context: ChatContext,
  reply: Pick<WorkspaceResponse, 'workspace' | 'start'>,
  version: number,
): boolean {
  if (!context.live() || versionOf(context, WORKSPACE_RECORD) !== version) {
    return false
  }
  context.store.update((snapshot) => ({
    ...snapshot,
    workspace: reply.workspace,
    start: reply.start,
  }))
  return true
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
