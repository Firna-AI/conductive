import type { ChatItem } from '../../fixtures/conversations'
import type { SecretRunItem } from '../../fixtures/secretRequests'
import { isPendingCommand } from './PendingCommand'

/**
 * Whether a run with secrets is a late request: its tool call ended
 * before an answer, so it stays at its place in the chat, also after its
 * answer, or after it ended with none. It never folds with the work of its
 * turn.
 */
export function isLateRequest(item: SecretRunItem): boolean {
  return (
    item.state === 'late' ||
    item.state === 'late-allowed' ||
    item.state === 'late-denied' ||
    item.state === 'not-answered'
  )
}

/** Whether a request names a secret that the org does not have. */
export function asksValue(item: SecretRunItem): boolean {
  return item.request.secrets.some((secret) => secret.description === undefined)
}

/**
 * Whether a chat item is a request that the chat pins just above the
 * composer while its tool call waits: a command on a Mac, or a request for
 * secrets.
 */
export function isPendingRequest(item: ChatItem): boolean {
  if (item.kind === 'secret-run') return item.state === 'waiting'
  return isPendingCommand(item)
}

/**
 * Whether a chat item waits for a member: a request above the composer,
 * or a late request without an answer. The workspace shows needs input
 * while any of them waits (decision 68).
 */
export function waitsForAnswer(item: ChatItem): boolean {
  if (item.kind === 'secret-run' && item.state === 'late') return true
  return isPendingRequest(item)
}
