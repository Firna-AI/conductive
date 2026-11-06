import type { RunnerEventRefused } from '../../shared/chat-events'
import type { Transcript, TranscriptItem } from './transcript'
import { endLostTurn, replaceAt } from './turn-events'

/** The marker is the refused end of a turn that was running. */
export function endsTurn(event: RunnerEventRefused): boolean {
  return (
    event.reason !== 'turn_not_active' &&
    (event.runnerEventType === 'turn.completed' ||
      event.runnerEventType === 'turn.failed')
  )
}

/**
 * Applies a refusal marker of a session (decision 76). The marker shows once,
 * as a line at its place among the other events. A refused end of a running
 * turn still ends the turn that the marker names, which is then the newest
 * turn. A marker without a turn, or of a turn that was not running, ends
 * nothing, because the chat cannot tell which turn ended.
 */
export function foldRefused(
  transcript: Transcript,
  event: RunnerEventRefused,
): Transcript {
  const ended =
    endsTurn(event) && event.turnId !== null
      ? {
          ...endLostTurn(transcript, event.turnId),
          newestTurnId: event.turnId,
        }
      : transcript
  const item: TranscriptItem = {
    kind: 'lost',
    id: `lost:${event.streamId}:${event.runnerEventNumber}`,
    marker: event,
  }
  const index = ended.items.findIndex((entry) => entry.id === item.id)
  return {
    ...ended,
    items:
      index < 0 ? [...ended.items, item] : replaceAt(ended.items, index, item),
  }
}
