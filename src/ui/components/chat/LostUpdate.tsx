import { CircleSlash, X } from 'lucide-react'
import { IconButton } from '../common/actions'
import { unavailableText, type UnavailableData } from './lostCopy'
import styles from './LostUpdate.module.css'

/**
 * Workspace data that a failed repair leaves unavailable: an update without
 * a session was lost, and the fresh full report that the workspace asked
 * for was lost too. The same notice shows when the cloud computer could not
 * read the files, and All files keeps its saved list.
 */
export type FailedRepair = {
  data: UnavailableData
  /**
   * The time since the data became unavailable, such as "4m ago". A list
   * that the cloud computer could not read has no known time.
   */
  ago?: string
}

function Text(props: { repair: FailedRepair }) {
  const { repair } = props
  return (
    <>
      <CircleSlash aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>{unavailableText(repair.data)}</span>
      {repair.ago ? <span className={styles.ago}>{repair.ago}</span> : null}
    </>
  )
}

/**
 * The notice of a failed repair of workspace data other than a file list,
 * such as the workspace name: a bar under the workspace header, above the
 * tabs, with Dismiss.
 */
export function LostUpdateBar(props: { repair: FailedRepair }) {
  return (
    <div className={styles.bar} role="status">
      <Text repair={props.repair} />
      <IconButton icon={X} label="Dismiss" quiet />
    </div>
  )
}

/**
 * The notice of a file list that is not the latest one, after a failed
 * repair or a failed read of the files: a row under the file lists of the
 * Files panel, in the column beside the chat or the Files tab of a phone.
 * The list of servers of the Preview tool shows the same row under its
 * port form after a failed repair.
 */
export function LostUpdateRow(props: { repair: FailedRepair }) {
  return (
    <div className={styles.row} role="status">
      <Text repair={props.repair} />
    </div>
  )
}
