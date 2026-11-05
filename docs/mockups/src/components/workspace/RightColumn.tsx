import type { ReactNode } from 'react'
import styles from './RightColumn.module.css'

/**
 * The column beside the chat: the pull request bar, the files panel, and
 * the tools panel below it.
 */
export function RightColumn(props: {
  pullRequest: ReactNode
  files: ReactNode
  tools: ReactNode
}) {
  return (
    <aside aria-label="Files and tools" className={styles.column}>
      {props.pullRequest}
      <div className={styles.files}>{props.files}</div>
      <div className={styles.tools}>{props.tools}</div>
    </aside>
  )
}
