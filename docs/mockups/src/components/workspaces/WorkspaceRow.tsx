import { Archive } from 'lucide-react'
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
 * One workspace on one line: its state as a small square on the left, its
 * name, and the time since its last activity. Archive covers the time on
 * hover or focus. A drag lifts the row and leaves a faint copy behind.
 */
export function WorkspaceRowView(props: {
  row: WorkspaceRow
  variant: 'sidebar' | 'page'
  drag?: RowDrag
  archivable?: boolean
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
  const archivable = props.archivable === true && row.status !== 'archived'
  return (
    <span
      className={classes(styles.container, archivable && styles.archivable)}
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
      {archivable ? (
        <span className={styles.archive}>
          <ScreenLink asChild to={paths.archive}>
            <IconButton icon={Archive} label="Archive workspace" quiet />
          </ScreenLink>
        </span>
      ) : null}
    </span>
  )
}
