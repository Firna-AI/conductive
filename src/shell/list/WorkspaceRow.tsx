import type { FocusEvent, HTMLAttributes, KeyboardEvent, Ref } from 'react'
import { Archive } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import styles from '../../../docs/mockups/src/components/workspaces/WorkspaceRow.module.css'
import { activityPresentation } from '../../../docs/mockups/src/components/workspaces/status'
import { routes } from '../../app/router'
import { ownPress } from '../../app/pointer-drag'
import { formatAgo } from '../../app/time'
import { nameLabel } from '../../shared/name-label'
import type { Workspace } from '../../shared/workspaces'
import { AppLink } from '../ui/AppLink'
import { IconButton } from '../ui/actions'
import ui from '../ui/ui.module.css'
import list from './list.module.css'

export type RowVariant = 'sidebar' | 'page'

/** How a drag shows a row: under the pointer, or faint where it was. */
export type RowDrag = 'lifted' | 'placeholder'

function RowContent(props: { workspace: Workspace; now: number }) {
  const { workspace } = props
  return (
    <>
      <StatusGlyph status={workspace.state} />
      <span className={styles.name}>{nameLabel(workspace.name)}</span>
      <span className={styles.time}>
        {formatAgo(props.now, workspace.updatedAt)}
      </span>
      <span className={ui.hidden}>
        , {activityPresentation[workspace.state].label}
      </span>
    </>
  )
}

/**
 * One workspace on one line: its state as a dot-matrix square, its name,
 * or Untitled before it has one, and the time since its last activity. Bold
 * marks unread output. Archive covers the time on hover only. A drag
 * lifts the row, and a faint copy stays where it was.
 */
export function WorkspaceRow({
  rowRef,
  linkRef,
  ...props
}: {
  workspace: Workspace
  variant: RowVariant
  selected: boolean
  now: number
  drag?: RowDrag
  /** The pointer handlers of a drag, and the keys that move the row. */
  bind?: HTMLAttributes<HTMLElement>
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  onArchive?: () => void
  /** The row's box, which a drag measures. */
  rowRef?: Ref<HTMLSpanElement>
  /** The row's link, which keeps the focus after a move by keys. */
  linkRef?: Ref<HTMLAnchorElement>
  /** A control in the row takes the focus, or loses it. */
  onFocus?: (event: FocusEvent<HTMLSpanElement>) => void
  onBlur?: (event: FocusEvent<HTMLSpanElement>) => void
}) {
  const { workspace } = props
  const className = classes(
    styles.row,
    props.variant === 'page' && styles.page,
    props.selected && styles.selected,
    styles[activityPresentation[workspace.state].emphasis],
    props.drag && styles[props.drag],
  )
  if (props.drag === 'lifted') {
    return (
      <div className={className}>
        <RowContent now={props.now} workspace={workspace} />
      </div>
    )
  }
  return (
    <span
      {...props.bind}
      className={classes(
        list.dragSurface,
        styles.container,
        props.onArchive && !props.drag && styles.archivable,
      )}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      ref={rowRef}
    >
      <AppLink
        aria-current={props.selected ? 'page' : undefined}
        className={className}
        ref={linkRef}
        to={routes.workspace(workspace.orgId, workspace.id)}
      >
        <RowContent now={props.now} workspace={workspace} />
      </AppLink>
      {props.onArchive && !props.drag ? (
        <span {...ownPress} className={styles.archive}>
          <IconButton
            icon={Archive}
            label="Archive workspace"
            onPress={props.onArchive}
            quiet
          />
        </span>
      ) : null}
    </span>
  )
}
