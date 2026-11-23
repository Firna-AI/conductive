import type { Workspace } from '../../shared/generated/Workspace'
import { createPortal } from 'react-dom'
import type { PointerDrag } from '../../app/pointer-drag'
import styles from '../../ui/components/workspaces/SectionList.module.css'
import ui from '../ui/ui.module.css'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'
import list from './list.module.css'

/**
 * The sub-workspaces that move with a tree, in the words that a screen
 * reader hears after the name of its top-level row, as the mockups say
 * them. None for a single row.
 */
export function carriedText(carried: number): string {
  if (carried === 0) return ''
  return ` and ${carried} ${carried === 1 ? 'sub-workspace' : 'sub-workspaces'}`
}

/**
 * The line where a dragged tree lands, before a top-level row or after the
 * last tree. It marks a place, not an edge.
 */
export function DropLine(props: {
  name: string
  carried: number
  section: string
}) {
  return (
    <li className={styles.drop}>
      <span aria-hidden className={styles.line}>
        <span className={styles.lineEnd} />
      </span>
      <span className={ui.hidden} role="status">
        Moving {props.name}
        {carriedText(props.carried)} to {props.section}
      </span>
    </li>
  )
}

/**
 * The lifted row under the pointer. It stands for its whole tree, or its
 * whole unit of the merge queue, with the count of the rows that move
 * with it, `carried`. It takes no pointer input.
 */
export function LiftedRow(props: {
  drag: PointerDrag<unknown, unknown>
  workspace: Workspace
  carried: number
  variant: RowVariant
  now: number
}) {
  const { drag } = props
  return createPortal(
    <div
      className={list.lifted}
      style={{
        left: drag.x - drag.offsetX,
        top: drag.y - drag.offsetY,
        width: drag.box.width,
      }}
    >
      <WorkspaceRow
        carried={props.carried}
        drag="lifted"
        now={props.now}
        selected={false}
        variant={props.variant}
        workspace={props.workspace}
      />
    </div>,
    document.body,
  )
}
