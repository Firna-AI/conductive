import type { RunnerEventRefused } from '../chat-events'
import { endsTurn } from './known-turns'
import type { TranscriptBatch } from './transcript-batch'
import { endShownTurn } from './turn-records'

/** A refusal is a line. Only the refused end of the newest running turn ends work. */
export function foldRefused(
  fold: TranscriptBatch,
  event: RunnerEventRefused,
): void {
  if (
    endsTurn(event) &&
    event.turnId !== null &&
    fold.turns.running(event.turnId)
  ) {
    endShownTurn(fold, event.turnId)
  }
  fold.items.put({
    kind: 'lost',
    id: `lost:${event.streamId}:${event.runnerEventNumber}`,
    marker: event,
  })
}
