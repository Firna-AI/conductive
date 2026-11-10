import type { ReactNode } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import type { WorkspaceRow } from './sections'
import { activityPresentation } from './status'
import { StatusGlyph } from './StatusGlyph'
import styles from './WorkspaceRow.module.css'

/** How a drag shows a row: lifted under the pointer, or left behind. */
export type RowDrag = 'lifted' | 'placeholder'

/**
 * The one action of a row: Archive for a workspace in a section, which
 * archives it at once, or Restore for an archived one, which puts it back
 * in its section.
 */
function rowAction(
  row: WorkspaceRow,
  archivable: boolean,
  restorable: boolean,
): ReactNode {
  if (row.status === 'archived') {
    return restorable ? (
      <ScreenLink asChild to={paths.restored}>
        <IconButton icon={ArchiveRestore} label="Restore workspace" quiet />
      </ScreenLink>
    ) : null
  }
  return archivable ? (
    <ScreenLink asChild to={paths.justArchived}>
      <IconButton icon={Archive} label="Archive workspace" quiet />
    </ScreenLink>
  ) : null
}

/**
 * One workspace on one line: its state as a small square on the left, its
 * name, and the time since its last activity. The action of the row covers
 * the time on hover only, and `row.hovered` draws the pointer over it. A
 * drag lifts the row and leaves a faint copy behind.
 */
export function WorkspaceRowView(props: {
  row: WorkspaceRow
  variant: 'sidebar' | 'page'
  drag?: RowDrag
  archivable?: boolean
  /** An archived row offers Restore. */
  restorable?: boolean
}) {
  const { row } = props
  const status = activityPresentation[row.status]
  const className = classes(
    styles.row,
    props.variant === 'page' && styles.page,
    row.selected && styles.selected,
    styles[status.emphasis],
    props.drag && styles[props.drag],
  )
  const content = (
    <>
      <StatusGlyph status={row.status} />
      <span className={styles.name}>{row.workspace.name}</span>
      <span className={styles.time}>{row.workspace.updated}</span>
      <span className={a11y.hidden}>, {status.label}</span>
    </>
  )
  if (props.drag) return <div className={className}>{content}</div>
  const action = rowAction(
    row,
    props.archivable === true,
    props.restorable === true,
  )
  return (
    <span
      className={classes(
        styles.container,
        action !== null && styles.archivable,
        row.hovered && styles.hovered,
      )}
    >
      {row.to ? (
        <ScreenLink
          aria-current={row.selected ? 'page' : undefined}
          className={className}
          to={row.to}
        >
          {content}
        </ScreenLink>
      ) : (
        <div className={className}>{content}</div>
      )}
      {action === null ? null : (
        <span className={styles.archive}>{action}</span>
      )}
    </span>
  )
}
