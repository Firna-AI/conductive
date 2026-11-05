import type { ReactNode } from 'react'
import { RightColumn } from './RightColumn'
import styles from './WorkspaceBody.module.css'

/**
 * The desktop workspace beside the sidebar: the chat under its header, and
 * the right column with the pull request, the files, and the tools.
 */
export function WorkspaceBody(props: {
  header: ReactNode
  chat: ReactNode
  pullRequest: ReactNode
  files: ReactNode
  tools: ReactNode
}) {
  return (
    <div className={styles.body}>
      <div className={styles.chat}>
        {props.header}
        {props.chat}
      </div>
      <RightColumn
        files={props.files}
        pullRequest={props.pullRequest}
        tools={props.tools}
      />
    </div>
  )
}
