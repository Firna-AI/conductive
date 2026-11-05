import type { ReactNode } from 'react'
import { ResizeHandle, rightColumnWidth } from '../layout/ResizeHandle'
import styles from './RightColumn.module.css'

/**
 * The column beside the chat: the pull request bar, the file lists, and the
 * tools panel below them. A handle on its inner edge resizes it. `width`
 * draws it while the user drags that handle.
 */
export function RightColumn(props: {
  pullRequest: ReactNode
  files: ReactNode
  tools: ReactNode
  width?: number
}) {
  const dragging = props.width !== undefined
  return (
    <aside
      aria-label="Files and tools"
      className={styles.column}
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
      <div className={styles.tools}>{props.tools}</div>
    </aside>
  )
}
