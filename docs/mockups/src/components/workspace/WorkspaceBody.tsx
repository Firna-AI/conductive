import type { ReactNode } from 'react'
import { RightColumn } from './RightColumn'
import styles from './WorkspaceBody.module.css'

/**
 * The desktop workspace beside the sidebar: the centre column with its
 * header, its tabs, and the open session or file, then the right column with
 * the pull request, the file lists, and the tools.
 */
export function WorkspaceBody(props: {
  header: ReactNode
  tabs: ReactNode
  center: ReactNode
  pullRequest: ReactNode
  files: ReactNode
  tools: ReactNode
  /** The width of the right column while the user drags its handle. */
  rightWidth?: number
}) {
  return (
    <div className={styles.body}>
      <div className={styles.chat}>
        {props.header}
        {props.tabs}
        {props.center}
      </div>
      <RightColumn
        files={props.files}
        pullRequest={props.pullRequest}
        tools={props.tools}
        width={props.rightWidth}
      />
    </div>
  )
}
