import { FileDiff, GitCommitHorizontal } from 'lucide-react'
import { continueQuestion } from './barCopy'
import styles from './LocalWorkList.module.css'

/**
 * The local work that the question of Continue lists: each changed file
 * that is not committed, and the commits that no remote branch holds, on
 * every local branch. The app and the mockups share it.
 */
export function LocalWorkList(props: {
  files: readonly string[]
  commits: number
}) {
  const { files, commits } = props
  return (
    <ul aria-label="Work that is not pushed" className={styles.list}>
      {files.map((file) => (
        <li className={styles.item} key={file}>
          <FileDiff aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>{file}</span>
          <span className={styles.detail}>{continueQuestion.notCommitted}</span>
        </li>
      ))}
      {commits > 0 ? (
        <li className={styles.item}>
          <GitCommitHorizontal aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>
            {continueQuestion.commits(commits)}
          </span>
          <span className={styles.detail}>{continueQuestion.notPushed}</span>
        </li>
      ) : null}
    </ul>
  )
}
