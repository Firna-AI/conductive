import { CircleSlash } from 'lucide-react'
import type { TurnEndReason } from '../../../../../src/shared/generated/TurnEndReason'
import type { ChangedFile } from '../../fixtures/files'
import { turnFileList } from '../../entries/components/chat/TurnFileList.mockup'
import { endReasonLine } from '../../entries/components/chat/EndReasonLine.mockup'
import { turnFilesUnavailable } from '../../../../../src/ui/components/chat/lostCopy'
import type { StandardSpeedCause } from '../../../../../src/ui/components/chat/speedCopy'
import { standardSpeedNote } from '../../entries/components/chat/StandardSpeedNote.mockup'
import styles from '../../../../../src/ui/components/chat/TurnEnd.module.css'

/**
 * The end of a finished turn: how long it ran, and the files it changed.
 * `TurnFileList` shows the first chips and a button for the rest, and
 * `TurnFileChip` draws each chip. The runner lists at most 200 files of a
 * turn. `omittedFiles` counts the rest.
 * `filesUnavailable` marks a turn whose changed files the cloud computer
 * could not read: the turn still ends with its duration, and plain text
 * takes the place of the chips.
 * `endReason` names a cause other than the end of the reply, such as the
 * time limit of background work: its line sits above the row.
 * `standardSpeed` names why a fast turn ran at standard speed: its note
 * stands beside the duration, which it explains, and the files go under it.
 */
export function TurnEnd(props: {
  duration: string
  files: readonly ChangedFile[]
  omittedFiles?: number
  filesUnavailable?: boolean
  endReason?: TurnEndReason
  standardSpeed?: StandardSpeedCause
}) {
  const more = props.omittedFiles ?? 0
  const files = (
    <>
      {props.filesUnavailable ? (
        <span className={styles.unavailable}>
          <CircleSlash aria-hidden className={styles.icon} size={12} />
          {turnFilesUnavailable}
        </span>
      ) : null}
      {props.files.length > 0 || more > 0 ? (
        <turnFileList.Component
          files={props.files}
          label="Files this turn changed"
          moklyInstance="turn-files"
          omittedFiles={more}
        />
      ) : null}
    </>
  )
  const row = (
    <div className={styles.end}>
      <span className={styles.duration}>{props.duration}</span>
      {props.standardSpeed === undefined ? (
        files
      ) : (
        <div className={styles.facts}>
          <standardSpeedNote.Component
            cause={props.standardSpeed}
            moklyInstance="standard-speed"
          />
          {files}
        </div>
      )}
    </div>
  )
  if (props.endReason === undefined) return row
  return (
    <div className={styles.ended}>
      <endReasonLine.Component
        moklyInstance="end-reason"
        reason={props.endReason}
      />
      {row}
    </div>
  )
}
