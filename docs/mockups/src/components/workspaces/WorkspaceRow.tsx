import { MockLink } from '@mokly/mokly'
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
 * name, and the time since its last activity. A drag lifts the row, and
 * leaves a faint copy where it was.
 */
export function WorkspaceRowView(props: {
  row: WorkspaceRow
  variant: 'sidebar' | 'page'
  drag?: RowDrag
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
  if (!row.to || props.drag) return <div className={className}>{content}</div>
  return (
    <MockLink
      aria-current={row.selected ? 'page' : undefined}
      className={className}
      to={row.to}
    >
      {content}
    </MockLink>
  )
}
