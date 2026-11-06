import type { HTMLAttributes, KeyboardEvent, Ref } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import styles from '../../../docs/mockups/src/components/workspaces/WorkspaceRow.module.css'
import { activityPresentation } from '../../../docs/mockups/src/components/workspaces/status'
import { routes } from '../../app/router'
import { formatAgo } from '../../app/time'
import type { Workspace } from '../../shared/workspaces'
import { AppLink } from '../ui/AppLink'
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
      <span className={styles.name}>{workspace.name}</span>
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
 * and the time since its last activity. Bold marks unread output. A drag
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
  /** The row's box, which a drag measures. */
  rowRef?: Ref<HTMLSpanElement>
  /** The row's link, which keeps the focus after a move by keys. */
  linkRef?: Ref<HTMLAnchorElement>
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
      className={list.dragSurface}
      onKeyDown={props.onKeyDown}
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
    </span>
  )
}
