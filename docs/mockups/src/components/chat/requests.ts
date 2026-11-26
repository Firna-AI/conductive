import type { ChatItem } from '../../fixtures/conversations'
import type { SecretRunItem } from '../../fixtures/secretRequests'
import {
  secretSetKey,
  type StackReader,
} from '../../../../../src/ui/components/chat/requestStackOrder'
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
 * Whether this view can answer an open request. Any member who sees the
 * session answers a request for secrets, in a browser or in the Mac app.
 * Only the Mac app on the Mac that got a command answers that command, so
 * a browser shows the state of the command only. The mockups draw the Mac
 * app on the Mac of the sender, which gets each command of the chat, so
 * `macApp` says whether the view is that Mac app.
 */
export function answersHere(item: ChatItem, macApp: boolean): boolean {
  return macApp || !isPendingCommand(item)
}

/**
 * What the order of the stack reads of the open requests of a chat, in a
 * browser or in the Mac app, as `stackEntries` of the shared UI orders
 * them. A chat shows one session, so each request is of that session. A
 * request for secrets names its set of secrets, and a command on a Mac
 * names none, so it never hides another request.
 */
export function stackReader(macApp: boolean): StackReader<ChatItem> {
  return {
    secrets: (item) =>
      item.kind === 'secret-run'
        ? secretSetKey(item.request.secrets.map((secret) => secret.name))
        : null,
    callWaits,
    answers: (item) => answersHere(item, macApp),
  }
}

/**
 * The place of the card on top of a stack of `count` cards, from 1: the
 * place that the member moved to, inside the stack. A stack starts at its
 * first card.
 */
export function shownPlace(count: number, place = 1): number {
  return Math.min(Math.max(place, 1), Math.max(count, 1))
}
