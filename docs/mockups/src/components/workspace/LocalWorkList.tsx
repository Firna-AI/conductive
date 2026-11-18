import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { FileDiff, GitCommitHorizontal } from 'lucide-react'
import { continueQuestion } from './barCopy'
import styles from './LocalWorkList.module.css'

/** One row of a work list: an icon, a name, and a detail at its end. */
export function WorkRow(props: {
  icon: LucideIcon
  name: string
  detail: string
}) {
  const Icon = props.icon
  return (
    <li className={styles.item}>
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.path}>{props.name}</span>
      <span className={styles.detail}>{props.detail}</span>
    </li>
  )
}

/**
 * The local work that the question of Continue lists: each changed file
 * that is not committed, and the commits that no remote branch holds, on
 * every local branch. The question of a repository change adds rows for
 * the work on GitHub, as `children`, and names each list with `label`. The
 * app and the mockups share it.
 */
export function LocalWorkList(props: {
  files: readonly string[]
  commits: number
  label?: string
  children?: ReactNode
}) {
  const { files, commits } = props
  return (
    <ul
      aria-label={props.label ?? 'Work that is not pushed'}
      className={styles.list}
    >
      {files.map((file) => (
        <WorkRow
          detail={continueQuestion.notCommitted}
          icon={FileDiff}
          key={file}
          name={file}
        />
      ))}
      {commits > 0 ? (
        <WorkRow
          detail={continueQuestion.notPushed}
          icon={GitCommitHorizontal}
          name={continueQuestion.commits(commits)}
        />
      ) : null}
      {props.children}
    </ul>
  )
}
