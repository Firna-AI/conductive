import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { RowMore, RowPointMenu, type RowControls } from './RowMenu'
import type { WorkspaceRow } from './sections'
import { activityPresentation } from './status'
import { StatusGlyph } from './StatusGlyph'
import rowMenu from './RowMenu.module.css'
import styles from './WorkspaceRow.module.css'

/** How a drag shows a row: lifted under the pointer, or left behind. */
export type RowDrag = 'lifted' | 'placeholder'

type Variant = 'sidebar' | 'page'

/**
 * The row of a workspace that the user renames from its menu. The field
 * takes the place of the name and the time, so the row shows no More. It
 * opens with the name selected, and after a failed save it keeps the draft.
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
      <StatusGlyph status={row.status} />
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
 * One workspace on one line: its state as a small square on the left, its
 * name, and the time since its last activity. A drag lifts the row, and
 * leaves a faint copy where it was. `controls` adds More beside the link,
 * the open menu, the field of Rename, or the fill of a hover. The lifted
 * row shows no More, and the faint copy keeps a faint one.
 */
export function WorkspaceRowView(props: {
  row: WorkspaceRow
  variant: Variant
  drag?: RowDrag
  controls?: RowControls
}) {
  const { row, drag } = props
  const controls = drag === 'lifted' ? undefined : props.controls
  if (controls?.rename && !drag) {
    return (
      <RenameRow rename={controls.rename} row={row} variant={props.variant} />
    )
  }
  const status = activityPresentation[row.status]
  const more = controls?.more ? controls : undefined
  const held = (controls?.open || controls?.hovered) && !row.selected
  const className = classes(
    styles.row,
    props.variant === 'page' && styles.page,
    row.selected && styles.selected,
    styles[status.emphasis],
    drag && !more && styles[drag],
    more && rowMenu.link,
    held && rowMenu.held,
  )
  const content = (
    <>
      <StatusGlyph status={row.status} />
      <span className={styles.name}>{row.workspace.name}</span>
      <span className={classes(styles.time, rowMenu.time)}>
        {row.workspace.updated}
      </span>
      <span className={a11y.hidden}>, {status.label}</span>
    </>
  )
  const link =
    !row.to || drag ? (
      <div className={className}>{content}</div>
    ) : (
      <ScreenLink
        aria-current={row.selected ? 'page' : undefined}
        className={className}
        to={row.to}
      >
        {content}
      </ScreenLink>
    )
  if (!more) return link
  return (
    <div
      className={classes(
        rowMenu.item,
        more.touch && rowMenu.touch,
        row.selected && rowMenu.current,
        more.open && rowMenu.open,
        more.hovered && rowMenu.hovered,
        drag && styles[drag],
      )}
    >
      {link}
      <RowMore controls={more} name={row.workspace.name} />
      <RowPointMenu controls={more} />
    </div>
  )
}
