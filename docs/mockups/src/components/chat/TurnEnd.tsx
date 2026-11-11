import { CircleSlash, FileText } from 'lucide-react'
import type { TurnEndReason } from '../../../../../src/shared/chat-events'
import { splitPath, type ChangedFile } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { DiffStat } from '../files/DiffStat'
import { paths } from '../../paths'
import { EndReasonLine } from './EndReasonLine'
import { moreFiles, turnFilesUnavailable } from './lostCopy'
import styles from './TurnEnd.module.css'

function FileChip(props: { file: ChangedFile }) {
  const { file } = props
  const content = (
    <>
      <FileText className={styles.icon} size={12} />
      {splitPath(file.path).name}
      <DiffStat added={file.added} removed={file.removed} />
    </>
  )
  if (!file.diff) return <span className={styles.chip}>{content}</span>
  return (
    <ScreenLink className={styles.chip} to={paths.diff}>
      {content}
    </ScreenLink>
  )
}

/**
 * The end of a finished turn: how long it ran, and the files it changed.
 * The runner lists at most 200 files of a turn. `omittedFiles` counts the
 * rest, as plain text after the last chip. `filesUnavailable` marks a turn
 * whose changed files the cloud computer could not read: the turn still
 * ends with its duration, and plain text takes the place of the chips.
 * `endReason` names a cause other than the end of the reply, such as the
 * time limit of background work: its line sits above the row.
 */
export function TurnEnd(props: {
  duration: string
  files: readonly ChangedFile[]
  omittedFiles?: number
  filesUnavailable?: boolean
  endReason?: TurnEndReason
}) {
  const more = props.omittedFiles ?? 0
  const row = (
    <div className={styles.end}>
      <span className={styles.duration}>{props.duration}</span>
      {props.filesUnavailable ? (
        <span className={styles.unavailable}>
          <CircleSlash aria-hidden className={styles.icon} size={12} />
          {turnFilesUnavailable}
        </span>
      ) : null}
      {props.files.length > 0 || more > 0 ? (
        <ul aria-label="Files this turn changed" className={styles.chips}>
          {props.files.map((file) => (
            <li key={file.path}>
              <FileChip file={file} />
            </li>
          ))}
          {more > 0 ? <li className={styles.more}>{moreFiles(more)}</li> : null}
        </ul>
      ) : null}
    </div>
  )
  if (props.endReason === undefined) return row
  return (
    <div className={styles.ended}>
      <EndReasonLine reason={props.endReason} />
      {row}
    </div>
  )
}
