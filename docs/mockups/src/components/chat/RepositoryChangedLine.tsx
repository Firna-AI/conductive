import { FolderGit2 } from 'lucide-react'
import { repositoryChangedNote } from '../workspace/repositoryMoveCopy'
import lineStyles from './LinkedLine.module.css'
import styles from './ContinuedLine.module.css'

/**
 * The note of a repository change in a session, at the place where it
 * happened: who changed it, the new repository, and the new branch. `who`
 * is "You" for the member who changed it. It takes no fixtures, so the app
 * can use it too.
 */
export function RepositoryChangedLine(props: {
  who: string
  repository: string
  branch: string
}) {
  const note = repositoryChangedNote(props.who)
  return (
    <p className={lineStyles.line}>
      <FolderGit2 aria-hidden className={lineStyles.icon} size={13} />
      <span>
        {note.before}
        <span className={styles.branch}>{props.repository}</span>
        {note.between}
        <span className={styles.branch}>{props.branch}</span>
      </span>
    </p>
  )
}
