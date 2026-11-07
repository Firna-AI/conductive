import { FileText } from 'lucide-react'
import { splitPath, type ChangedFile } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { DiffStat } from '../files/DiffStat'
import { paths } from '../../paths'
import { moreFiles } from './lostCopy'
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
 * rest, as plain text after the last chip.
 */
export function TurnEnd(props: {
  duration: string
  files: readonly ChangedFile[]
  omittedFiles?: number
}) {
  const more = props.omittedFiles ?? 0
  return (
    <div className={styles.end}>
      <span className={styles.duration}>{props.duration}</span>
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
}
