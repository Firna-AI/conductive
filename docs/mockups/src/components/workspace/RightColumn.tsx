import type { ReactNode } from 'react'
import { ResizeHandle, rightColumnWidth } from '../layout/ResizeHandle'
import styles from './RightColumn.module.css'

/**
 * The column beside the chat: the pull request bar, the file lists, and the
 * tools panel below them. A handle on its inner edge resizes it. `width`
 * draws it while the user drags that handle. Without `tools`, the files
 * part fills the column, as for an archived workspace. `hidden` draws the
 * column that the user hid with the toggle at the end of the header.
 */
export function RightColumn(props: {
  pullRequest: ReactNode
  files: ReactNode
  tools?: ReactNode
  width?: number
  hidden?: boolean
}) {
  const dragging = props.width !== undefined
  return (
    <aside
      aria-label="Files and tools"
      className={styles.column}
      hidden={props.hidden}
      style={dragging ? { width: props.width } : undefined}
    >
      <ResizeHandle
        active={dragging}
        edge="left"
        label="Resize the right column"
        width={{
          ...rightColumnWidth,
          value: props.width ?? rightColumnWidth.value,
        }}
      />
      {props.pullRequest}
      <div className={styles.files}>{props.files}</div>
      {props.tools ? <div className={styles.tools}>{props.tools}</div> : null}
    </aside>
  )
}
