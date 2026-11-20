import type { ChatItem } from '../../fixtures/conversations'
import type { SecretRunItem } from '../../fixtures/secretRequests'
import { isPendingCommand } from './PendingCommand'

/**
 * Whether a run with secrets is a late request: its tool call ended
 * before an answer. While it waits for a member, it stays above the
 * composer. After its answer, or after it ended with none, it stays at its
 * place in its turn. It never folds with the work of its turn.
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
 * Whether a chat item is a request whose tool call waits for its answer: a
 * command on a Mac, or a request for secrets.
 */
function callWaits(item: ChatItem): boolean {
  if (item.kind === 'secret-run') return item.state === 'waiting'
  return isPendingCommand(item)
}

/** Whether a chat item is a late request that waits for a member. */
function lateWaits(item: ChatItem): boolean {
  return item.kind === 'secret-run' && item.state === 'late'
}

/**
 * Whether a chat item is an open request, which the chat pins just above
 * the composer: a request whose tool call waits, or a late request that
 * waits for a member (needs-input decision 1 A). The workspace shows needs
 * input while any of them is open (decision 68). An answered or ended
 * request takes its place in the chat.
 */
export function isPendingRequest(item: ChatItem): boolean {
  return callWaits(item) || lateWaits(item)
}

/**
 * The open requests in the order of the region above the composer: the
 * requests whose tool calls wait first, then the late requests, each group
 * oldest first. A tool call that waits has a time limit, and a late request
 * has none.
 */
export function pendingRequests(items: readonly ChatItem[]): ChatItem[] {
  return [...items.filter(callWaits), ...items.filter(lateWaits)]
}
