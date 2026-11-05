import { Hourglass } from 'lucide-react'
import { ScreenLink } from '../common/ScreenLink'
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
 * name, and the time since its last activity. A workspace whose cloud
 * computer is deleted soon shows an hourglass. A drag lifts the row, and
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
  const { expires } = row.workspace
  const content = (
    <>
      <StatusGlyph status={row.status} />
      <span className={styles.name}>{row.workspace.name}</span>
      {expires ? (
        <span
          className={classes(styles.time, styles.expiring)}
          title={`Its cloud computer is deleted ${expires}. Open the workspace to keep its files.`}
        >
          <Hourglass aria-hidden size={11} />
          {row.workspace.updated}
        </span>
      ) : (
        <span className={styles.time}>{row.workspace.updated}</span>
      )}
      <span className={a11y.hidden}>
        , {status.label}
        {expires ? `, expires ${expires}` : null}
      </span>
    </>
  )
  if (!row.to || props.drag) return <div className={className}>{content}</div>
  return (
    <ScreenLink
      aria-current={row.selected ? 'page' : undefined}
      className={className}
      to={row.to}
    >
      {content}
    </ScreenLink>
  )
}
