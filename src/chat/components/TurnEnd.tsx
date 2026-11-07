import { FileText } from 'lucide-react'
import type { ChangedFile } from '../../shared/files'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { DiffStat } from '../../../docs/mockups/src/components/files/DiffStat'
import { moreFiles } from '../../../docs/mockups/src/components/chat/lostCopy'
import styles from '../../../docs/mockups/src/components/chat/TurnEnd.module.css'
import { formatDuration } from '../state/format'
import controls from '../ui/controls.module.css'
import local from './chat.module.css'

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function FileChip(props: {
  file: ChangedFile
  onOpenDiff?: (path: string) => void
}) {
  const { file, onOpenDiff } = props
  const content = (
    <>
      <FileText className={styles.icon} size={12} />
      {fileName(file.path)}
      <DiffStat added={file.added} removed={file.removed} />
    </>
  )
  if (!onOpenDiff) return <span className={styles.chip}>{content}</span>
  return (
    <button
      aria-label={`Open the changes of ${file.path}`}
      className={classes(controls.bare, styles.chip, local.chipButton)}
      onClick={() => onOpenDiff(file.path)}
      type="button"
    >
      {content}
    </button>
  )
}

/**
 * The end of a finished turn: how long it ran, and the files that it changed.
 * Each file opens its diff when the app gives `onOpenDiff`. The runner lists
 * at most 200 files of a turn, and `omittedFiles` counts the rest as plain
 * text after the list.
 */
export function TurnEnd(props: {
  durationMs: number
  files: readonly ChangedFile[]
  omittedFiles: number
  onOpenDiff?: (path: string) => void
}) {
  const more = props.omittedFiles
  return (
    <div className={styles.end}>
      <span className={styles.duration}>
        {formatDuration(props.durationMs)}
      </span>
      {props.files.length > 0 || more > 0 ? (
        <ul aria-label="Files this turn changed" className={styles.chips}>
          {props.files.map((file) => (
            <li key={file.path}>
              <FileChip file={file} onOpenDiff={props.onOpenDiff} />
            </li>
          ))}
          {more > 0 ? <li className={styles.more}>{moreFiles(more)}</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
