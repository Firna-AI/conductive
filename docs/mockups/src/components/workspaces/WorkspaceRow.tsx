import { MockLink } from '@mokly/mokly'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import type { WorkspaceRow } from './groups'
import { activityPresentation } from './status'
import styles from './WorkspaceRow.module.css'

/** The state of a row: a spinner while busy, an icon, or nothing. */
function RowGlyph(props: { row: WorkspaceRow }) {
  const theme = useSharedUiTheme()
  const status = activityPresentation[props.row.status]
  if (status.busy) {
    const color = status.active ? theme.colors.primary : theme.colors.muted
    return <Spinner color={color} size={11} />
  }
  const Icon = status.icon
  if (!Icon) return null
  return <Icon aria-hidden className={styles.glyph} size={13} />
}

/**
 * One workspace on one line: its name, its state, and the time since its
 * last activity. A running agent makes the row bold, and a stopped sandbox
 * dims it.
 */
export function WorkspaceRowView(props: {
  row: WorkspaceRow
  variant: 'sidebar' | 'page'
}) {
  const { row } = props
  const status = activityPresentation[row.status]
  const className = classes(
    styles.row,
    props.variant === 'page' && styles.page,
    row.selected && styles.selected,
    status.active && styles.active,
    status.dim && styles.dim,
    status.tone === 'danger' && styles.danger,
  )
  const content = (
    <>
      <span className={styles.name}>{row.workspace.name}</span>
      <RowGlyph row={row} />
      <span className={styles.time}>{row.workspace.updated}</span>
      <span className={a11y.hidden}>, {status.label}</span>
    </>
  )
  if (!row.to) return <div className={className}>{content}</div>
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
