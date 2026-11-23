import type { RunnerEventRefused } from '../chat-events'
import type { Transcript, TranscriptItem } from './transcript'
import { transcriptLookups } from './transcript-lookups'

/** A turn of the session that an accepted event named. */
export interface KnownTurn {
  id: string
  /** Its end arrived: a completion, a failure, or a refused end while it ran. */
  ended: boolean
  /** The messages that the turn took: at its start, and sent into it. */
  messageIds: readonly string[]
}

/**
 * A known turn has ended when its end arrived, or when a newer turn started,
 * because a session runs one turn at a time.
 */
export function hasEnded(transcript: Transcript, turnId: string): boolean {
  const known = transcriptLookups(transcript).turns.get(turnId)
  return (
    known !== undefined &&
    (known.turn.ended || known.rank < transcript.turns.length - 1)
  )
}

/**
 * The failed item that offers Try again: it names the message that the
 * newest record of the session names. A turn that continues the unanswered
 * messages of a finished turn takes their IDs, so a late failure of the
 * older turn can name the same message. Then only the item of the newer
 * turn offers it.
 */
export function retryItemId(transcript: Transcript): string | null {
  const { retryMessageId } = transcript
  if (retryMessageId === null) return null
  let chosen: { id: string; rank: number } | null = null
  for (const item of transcript.items) {
    if (item.kind !== 'failed' || item.retryMessageId !== retryMessageId) {
      continue
    }
    const rank =
      transcriptLookups(transcript).turns.get(item.turnId)?.rank ?? -1
    if (!chosen || rank > chosen.rank) chosen = { id: item.id, rank }
  }
  return chosen?.id ?? null
}

/** A wake line belongs to the turn that took its hidden message. */
export function turnOf(
  transcript: Transcript,
  item: TranscriptItem,
): string | null {
  switch (item.kind) {
    case 'user':
      return transcriptLookups(transcript).owners.get(item.message.id) ?? null
    case 'wake':
      return (
        transcriptLookups(transcript).owners.get(item.notice.messageId) ?? null
      )
    case 'lost':
      return item.marker.turnId
    case 'continued':
    case 'capabilities-changed':
    case 'repository-changed':
      return null
    default:
      return item.turnId
  }
}

/**
 * The marker names a refused end of a turn: a completion or a failure that
 * the workspace refused for its size or its form. A turn that never started
 * has no end to refuse.
 */
export function endsTurn(event: RunnerEventRefused): boolean {
  return (
    event.reason !== 'turn_not_active' &&
    (event.runnerEventType === 'turn.completed' ||
      event.runnerEventType === 'turn.failed')
  )
}
