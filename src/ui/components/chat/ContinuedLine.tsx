import { GitBranchPlus } from 'lucide-react'
import { continuedNote } from '../workspace/barCopy'
import lineStyles from './LinkedLine.module.css'
import styles from './ContinuedLine.module.css'

/**
 * The note of Continue in a session, at the place where it happened: who
 * pressed Continue, the new branch of the workspace, and its base. `who` is
 * "You" for the member who pressed it. It takes no fixtures, so the app can
 * use it too.
 */
export function ContinuedLine(props: {
  who: string
  branch: string
  base: string
}) {
  const note = continuedNote(props.who, props.base)
  return (
    <p className={lineStyles.line}>
      <GitBranchPlus aria-hidden className={lineStyles.icon} size={13} />
      <span>
        {note.before}
        <span className={styles.branch}>{props.branch}</span>
        {note.after}
      </span>
    </p>
  )
}
