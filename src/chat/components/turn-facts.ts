import type { TurnEndReason } from '../../shared/generated/TurnEndReason'
import type { StandardSpeedCause } from '../../ui/components/chat/speedCopy'
import type { Transcript } from '../../shared/transcript/transcript'
import type { SingleItem } from '../../shared/transcript/transcript-entries'
import {
  filesUnread,
  omittedFiles,
  standardSpeedOf,
  stoppedAttribution,
  stoppedNotes,
  turnEndReason,
  type ChatReaders,
} from '../../shared/transcript/turn-words'

export type TurnEndItem = Extract<SingleItem, { kind: 'turn-end' }>
export type StoppedItem = Extract<SingleItem, { kind: 'stopped' }>

/**
 * What the row of a finished turn shows from the end of its turn, which the
 * transcript keeps apart from the row: the end reason, the files that the
 * cloud computer could not read or that the runner left out, and the
 * standard speed of a fast turn.
 */
export interface EndFacts {
  endReason?: TurnEndReason
  filesUnavailable: boolean
  omittedFiles: number
  standardSpeed?: { cause?: StandardSpeedCause }
}

/** The facts of the end of the turn of `item`. */
export function endFacts(transcript: Transcript, item: TurnEndItem): EndFacts {
  return {
    endReason: turnEndReason(transcript, item.turnId),
    // Files that a row lists stay true, also after a later end.
    filesUnavailable:
      item.files.length === 0 && filesUnread(transcript, item.turnId),
    omittedFiles: omittedFiles(transcript, item.turnId),
    standardSpeed: standardSpeedOf(transcript, item.turnId),
  }
}

/**
 * What the line of a stopped turn shows from outside its item: the notes of
 * the end of its turn, and who stopped it, as `readers` names them.
 */
export interface StopFacts {
  notes: readonly string[]
  attribution: ReturnType<typeof stoppedAttribution>
}

/** The facts of the stop of the turn of `item`. */
export function stopFacts(
  transcript: Transcript,
  item: StoppedItem,
  readers: ChatReaders,
): StopFacts {
  return {
    notes: stoppedNotes(transcript, item.turnId),
    attribution: stoppedAttribution(transcript, item.turnId, item.by, readers),
  }
}
