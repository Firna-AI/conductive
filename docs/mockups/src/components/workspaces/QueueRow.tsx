import { CircleAlert } from 'lucide-react'
import { queueLabels } from '../workspace/queueCopy'
import { workspaceMark } from '../../entries/components/workspaces/WorkspaceMark.mockup'
import { rowPointMenu } from '../../entries/components/workspaces/RowMenu.mockup'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import type { QueueEntry } from './queue'
import type { RowControls } from './RowMenu'
import { listMarkLabel } from './status'
import type { RowDrag } from './WorkspaceRow'
import { WorkspaceName, type EmphasisClasses } from './WorkspaceName'
import rowStyles from './WorkspaceRow.module.css'
import styles from './MergeQueue.module.css'

/** The look of a name in each state, as in the rows of the sections. */
const nameEmphasis: EmphasisClasses = {
  strong: rowStyles.strong,
  active: rowStyles.active,
  dim: rowStyles.dim,
}

/** What a screen reader hears for the place of an entry. */
function placeText(place: number | null): string {
  return place === null ? queueLabels.attention : `Place ${place}`
}

/**
 * One entry of a queue in the Merge queue group: its place, its list mark,
 * and its name, with its step under the name. An entry that needs
 * attention shows the alert icon in place of its place, and its reason
 * under its name. The mark shows the GitHub state of its checks, as in the
 * sections. A drag lifts the row without its step, as a compact card,
 * and leaves a faint copy behind. The lifted first row of a member stack
 * shows the count of the rows that move with it. `controls` draws the menu that a right click opened, or a
 * hover, because a view runs no script.
 */
export function QueueRowView(props: {
  entry: QueueEntry
  /** Its place in the stack, or null for an entry that needs attention. */
  place: number | null
  variant: 'sidebar' | 'page'
  drag?: RowDrag
  /** The rows of its member stack that move with a lifted row. */
  carried?: number
  controls?: RowControls
}) {
  const { entry, place } = props
  const { row } = entry
  const controls = props.drag ? undefined : props.controls
  const carried = props.drag === 'lifted' ? (props.carried ?? 0) : 0
  const className = classes(
    styles.entry,
    props.variant === 'page' && styles.page,
    row.selected && styles.current,
    props.drag === 'lifted' && styles.lifted,
    props.drag === 'placeholder' && styles.faint,
    carried > 0 && styles.liftedUnit,
  )
  const content = (
    <>
      <span aria-hidden className={styles.place}>
        {place === null ? (
          <CircleAlert className={styles.alert} size={12} />
        ) : (
          place
        )}
      </span>
      <span className={styles.mark}>
        <workspaceMark.Component github={row.github} status={row.status} />
      </span>
      <WorkspaceName
        className={styles.name}
        emphasis={nameEmphasis}
        status={row.status}
      >
        {row.workspace.name}
      </WorkspaceName>
      {carried > 0 ? (
        <span className={classes(styles.more, styles.moving)}>+{carried}</span>
      ) : null}
      {props.drag === 'lifted' ? null : (
        <span className={styles.step}>{entry.step}</span>
      )}
      <span className={a11y.hidden}>
        , {placeText(place)}, #{entry.pullRequest},{' '}
        {listMarkLabel(row.github, row.status)}
      </span>
    </>
  )
  if (props.drag) return <div className={className}>{content}</div>
  // The pointer of a right click lies over the row of its menu. A sheet
  // keeps its row marked, without a hover.
  const hovered = controls?.open?.at === 'pointer' || controls?.hovered
  const held = controls?.open?.at === 'sheet'
  return (
    <span
      className={classes(
        styles.item,
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
      {controls ? <rowPointMenu.Component controls={controls} /> : null}
    </span>
  )
}
