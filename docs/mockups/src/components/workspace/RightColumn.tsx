import type { CSSProperties, ReactNode } from 'react'
import { classes } from '../common/classes'
import {
  filesShare as filesRange,
  ResizeHandle,
  rightColumnWidth,
} from '../layout/ResizeHandle'
import styles from './RightColumn.module.css'

/**
 * The heights of the file lists and the tools panel for a share of the
 * file lists, in percent. Both parts shrink by the same ratio to fit the
 * column, so the split stays at the share at each height of the window.
 */
export function splitStyles(share: number): {
  files: CSSProperties
  tools: CSSProperties
} {
  return {
    files: { flexBasis: `${share}%` },
    tools: { flexBasis: `${100 - share}%` },
  }
}

/**
 * The column beside the chat: the pull request bar, the file lists, and the
 * tools panel below them. A handle on its inner edge resizes it. A second
 * handle on the top edge of the tools panel moves the split between the
 * file lists and the tools. `width` and `filesShare` draw the column while
 * the user drags a handle. Without `tools`, the files part fills the
 * column, as for an archived workspace. `hidden` draws the column that the
 * user hid with the toggle at the end of the header. `split` draws the
 * column beside two panes, which it gives way to.
 */
export function RightColumn(props: {
  pullRequest: ReactNode
  files: ReactNode
  tools?: ReactNode
  width?: number
  /** The share of the file lists, in percent, while the user drags the split. */
  filesShare?: number
  hidden?: boolean
  /** The centre column shows two panes (split panes decision 6 G). */
  split?: boolean
}) {
  const dragging = props.width !== undefined
  const splitting = props.filesShare !== undefined
  const split = splitting ? splitStyles(props.filesShare ?? 0) : undefined
  return (
    <aside
      aria-label="Files and tools"
      className={classes(styles.column, props.split && styles.split)}
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
      <div className={styles.files} style={split?.files}>
        {props.files}
      </div>
      {props.tools ? (
        <div className={styles.tools} style={split?.tools}>
          <ResizeHandle
            active={splitting}
            edge="top"
            label="Resize the files and the tools"
            width={{
              ...filesRange,
              value: props.filesShare ?? filesRange.value,
            }}
          />
          {props.tools}
        </div>
      ) : null}
    </aside>
  )
}
