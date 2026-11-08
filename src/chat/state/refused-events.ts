import type { RunnerEventRefused } from '../../shared/chat-events'
import { endsTurn, isRunning } from './known-turns'
import type { Transcript, TranscriptItem } from './transcript'
import { replaceAt } from './turn-events'
import { endShownTurn } from './turn-records'

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
      ? endShownTurn(transcript, event.turnId)
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
