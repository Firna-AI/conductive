import type { ContinuationNext } from '../../../docs/mockups/src/components/chat/continuationCopy'
import type { ChatEvent } from '../chat-events'
import { turnContinuedKey } from './item-keys'
import { isEnd } from './item-placement'
import type { RecoveryLogin } from './recovery-login'
import type { Transcript, TranscriptItem } from './transcript'
import { replaceAt } from './turn-events'

type TurnContinuedEvent = Extract<ChatEvent, { type: 'turn.continued' }>

/** The line after a turn that a provider stop ended. */
export type TurnContinuedItem = Extract<
  TranscriptItem,
  { kind: 'turn-continued' }
>

function itemOf(event: TurnContinuedEvent): TurnContinuedItem {
  const { previousTurnId } = event
  const id = turnContinuedKey(previousTurnId)
  return event.next === 'turn'
    ? {
        kind: 'turn-continued',
        id,
        previousTurnId,
        next: 'turn',
        turnId: event.turnId,
      }
    : {
        kind: 'turn-continued',
        id,
        previousTurnId,
        next: event.next,
        turnId: null,
      }
}

/**
 * Applies the line after a provider stop. It goes right under the row where
 * the turn of `previousTurnId` ended, so it comes before a message that
 * waits for a later turn, such as one sent after the stop. Until that row
 * is there, the line goes at the end, at its place among the events. A
 * repeat of the line replaces it in place.
 */
export function foldTurnContinued(
  transcript: Transcript,
  event: TurnContinuedEvent,
): Transcript {
  const item = itemOf(event)
  const { items } = transcript
  const index = items.findIndex((entry) => entry.id === item.id)
  if (index >= 0) {
    return { ...transcript, items: replaceAt(items, index, item) }
  }
  const end = items.findLastIndex((entry) => isEnd(entry, item.previousTurnId))
  const at = end < 0 ? items.length : end + 1
  return {
    ...transcript,
    items: [...items.slice(0, at), item, ...items.slice(at)],
  }
}

/**
 * What comes after the stop, as the line says it. When the login of the
 * session is gone, the line names who connects `login` again. Without the
 * record of the session, the chat cannot name that login, so the line then
 * asks for a message, as it does when no turn follows for another reason.
 */
export function continuationNext(
  item: TurnContinuedItem,
  login: RecoveryLogin | null,
): ContinuationNext {
  switch (item.next) {
    case 'turn':
      return { kind: 'turn' }
    case 'message':
      return { kind: 'message' }
    case 'reconnect':
      return login === null
        ? { kind: 'message' }
        : { kind: 'reconnect', owner: login.owner, agent: login.agent }
  }
}
