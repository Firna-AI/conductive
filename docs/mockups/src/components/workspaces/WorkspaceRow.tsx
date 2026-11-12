import type { ReactNode } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { RowPointMenu, type RowControls } from './RowMenu'
import type { WorkspaceRow } from './sections'
import { activityPresentation, listMarkLabel } from './status'
import { WorkspaceMark } from './WorkspaceMark'
import rowMenu from './RowMenu.module.css'
import styles from './WorkspaceRow.module.css'

/** How a drag shows a row: lifted under the pointer, or left behind. */
export type RowDrag = 'lifted' | 'placeholder'

type Variant = 'sidebar' | 'page'

/**
 * The row of a workspace that the user renames from its menu. The field
 * takes the place of the name and the time. It opens with the name
 * selected, and after a failed save it keeps the draft.
 */
function RenameRow(props: {
  row: WorkspaceRow
  variant: Variant
  rename: { value: string; selected: boolean }
}) {
  const { row, rename } = props
  const page = props.variant === 'page'
  return (
    <form
      className={classes(
        styles.row,
        page && styles.page,
        row.selected && styles.selected,
      )}
    >
      <WorkspaceMark github={row.github} status={row.status} />
      <span
        aria-label="Workspace name"
        className={classes(rowMenu.field, page && rowMenu.fieldPage)}
        role="textbox"
      >
        {rename.selected ? (
          <span className={rowMenu.selection}>{rename.value}</span>
        ) : (
          rename.value
        )}
      </span>
    </form>
  )
}

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
 * One workspace on one line: its list mark on the left, its name, and the
 * time since its last activity. The mark shows the GitHub state of its
 * pull request in colour, and whether its agent works. The action of the
 * row, Archive or Restore, covers the time on hover only. A drag lifts the
 * row and leaves a faint copy behind. `controls` draws the menu that a
 * right click opened, the field of Rename, or a hover, because a view runs
 * no script.
 */
export function WorkspaceRowView(props: {
  row: WorkspaceRow
  variant: Variant
  drag?: RowDrag
  archivable?: boolean
  /** An archived row offers Restore. */
  restorable?: boolean
  controls?: RowControls
}) {
  const { row } = props
  const controls = props.drag ? undefined : props.controls
  if (controls?.rename) {
    return (
      <RenameRow rename={controls.rename} row={row} variant={props.variant} />
    )
  }
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
      <WorkspaceMark github={row.github} status={row.status} />
      <span className={styles.name}>{row.workspace.name}</span>
      <span className={styles.time}>{row.workspace.updated}</span>
      <span className={a11y.hidden}>
        , {listMarkLabel(row.github, row.status)}
      </span>
    </>
  )
  if (props.drag) return <div className={className}>{content}</div>
  const action = rowAction(
    row,
    props.archivable === true,
    props.restorable === true,
  )
  // The pointer of a right click lies over the row of its menu. A sheet
  // keeps its row marked, without a hover.
  const hovered = controls?.open?.at === 'pointer' || controls?.hovered
  const held = controls?.open?.at === 'sheet'
  return (
    <span
      className={classes(
        styles.container,
        action !== null && styles.archivable,
        hovered && styles.hovered,
        held && styles.held,
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
      {controls ? <RowPointMenu controls={controls} /> : null}
    </span>
  )
}
