import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import { instanceKey } from '../../instanceKey'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import type { WorkspaceRow } from './sections'
import styles from '../../../../../src/ui/components/workspaces/SectionList.module.css'

/**
 * The sub-workspaces that move with a tree, in the words that a screen
 * reader hears after the name of its top-level row. None for a single row.
 */
function carriedText(carried: number): string | null {
  if (carried === 0) return null
  return ` and ${carried} ${carried === 1 ? 'sub-workspace' : 'sub-workspaces'}`
}

/**
 * Where a dragged workspace lands: a line between two trees of a section,
 * and the row under the pointer. The line starts at the edge of a top-level
 * row, because a drop never nests a workspace. The lifted row of a tree
 * stands for the whole tree, with the count of the nested rows, `carried`,
 * that move with it.
 */
export function RowDrop(props: {
  row: WorkspaceRow
  carried: number
  section: string
  variant: 'sidebar' | 'page'
}) {
  return (
    <li className={styles.drop}>
      <span aria-hidden className={styles.line}>
        <span className={styles.lineEnd} />
      </span>
      <span aria-hidden className={styles.lifted}>
        <workspaceRow.Component
          carried={props.carried}
          drag="lifted"
          moklyInstance={`${instanceKey(props.row.workspace.key)}-lifted`}
          row={props.row}
          variant={props.variant}
        />
      </span>
      <span className={a11y.hidden} role="status">
        Moving {props.row.workspace.name}
        {carriedText(props.carried)} to {props.section}
      </span>
    </li>
  )
}
