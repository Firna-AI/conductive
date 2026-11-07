import type { RunnerEventRefused } from '../../shared/chat-events'
import { endsTurn, endTurn, isRunning } from './known-turns'
import type { Transcript, TranscriptItem } from './transcript'
import { endLostTurn, replaceAt } from './turn-events'

/**
 * Applies a refusal marker of a session. The marker shows once, as a line at
 * its place among the other events. A refused end of the running turn still
 * ends that turn. A marker starts no turn and never changes the newest turn:
 * a marker of an ended turn, of a turn that never started, or without a turn
 * ends nothing.
 */
export function foldRefused(
  transcript: Transcript,
  event: RunnerEventRefused,
): Transcript {
  const ended =
    endsTurn(event) &&
    event.turnId !== null &&
    isRunning(transcript, event.turnId)
      ? {
          ...endLostTurn(transcript, event.turnId),
          turns: endTurn(transcript.turns, event.turnId),
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
