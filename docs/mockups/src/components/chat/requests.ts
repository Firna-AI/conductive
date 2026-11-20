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

/**
 * One card of the stack of requests above the composer: an open request,
 * and the older open requests that it hides. A request for secrets hides
 * each older open request of its session for the same set of secrets, so
 * only the newest of them shows, and one answer settles each of them. A
 * command on a Mac never hides another request, because each Allow runs
 * one exact command.
 */
export type StackEntry = {
  item: ChatItem
  hidden: readonly SecretRunItem[]
}

/** The names of the secrets of a request, as one key for the whole set. */
function secretSet(item: SecretRunItem): string {
  return item.request.secrets
    .map((secret) => secret.name)
    .sort()
    .join('\n')
}

/** Whether two open requests ask for the same set of secrets. */
function sameSecrets(a: ChatItem, b: ChatItem): boolean {
  if (a.kind !== 'secret-run' || b.kind !== 'secret-run') return false
  return secretSet(a) === secretSet(b)
}

/**
 * The cards of the stack, in the order of the region. A card that hides
 * older requests takes the place of the oldest request that it holds, so a
 * new ask of the agent does not move a card that already waits. A request
 * whose call waits keeps its card among those whose calls wait. A chat
 * shows one session, so each request of `items` is of that session.
 */
export function stackEntries(items: readonly ChatItem[]): StackEntry[] {
  const entries: StackEntry[] = []
  for (const item of pendingRequests(items)) {
    const at = entries.findIndex((entry) => sameSecrets(entry.item, item))
    const shown = at === -1 ? undefined : entries[at].item
    if (shown?.kind !== 'secret-run' || item.kind !== 'secret-run') {
      entries.push({ item, hidden: [] })
      continue
    }
    const hidden = entries[at].hidden
    entries[at] =
      items.indexOf(item) > items.indexOf(shown)
        ? { item, hidden: [...hidden, shown] }
        : { item: shown, hidden: [...hidden, item] }
  }
  return entries
}

/**
 * The place of the card on top of a stack of `count` cards, from 1: the
 * place that the member moved to, inside the stack. A stack starts at its
 * first card.
 */
export function shownPlace(count: number, place = 1): number {
  return Math.min(Math.max(place, 1), Math.max(count, 1))
}
