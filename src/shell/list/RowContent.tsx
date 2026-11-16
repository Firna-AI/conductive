import type { Workspace } from '../../shared/generated/Workspace'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { WorkspaceMark } from '../../../docs/mockups/src/components/workspaces/WorkspaceMark'
import styles from '../../../docs/mockups/src/components/workspaces/WorkspaceRow.module.css'
import { listMarkLabel } from '../../../docs/mockups/src/components/workspaces/status'
import { formatAgo } from '../../app/time'
import { nameLabel } from '../../shared/name-label'
import { MAX_WORKSPACE_DEPTH } from '../../shared/workspace-tree'
import ui from '../ui/ui.module.css'

/**
 * The classes of a nested row: the indent of each level that the list
 * shows above it, and the guide lines of its tree. A top-level row has
 * none.
 */
export function nestedClasses(depth: number): string | undefined {
  if (depth <= 0) return undefined
  const steps = Math.min(depth, MAX_WORKSPACE_DEPTH)
  return classes(styles.nested, styles[`indent${steps}`])
}

/**
 * The mark, the name, and the time of a row. A lifted row of a tree shows
 * the count of the nested rows that move with it, `carried`, in place of
 * its time.
 */
export function RowContent(props: {
  workspace: Workspace
  now: number
  carried: number
}) {
  const { workspace } = props
  return (
    <>
      <WorkspaceMark github={workspace.github} status={workspace.state} />
      <span className={styles.name}>{nameLabel(workspace.name)}</span>
      {props.carried > 0 ? (
        <span className={styles.moving}>+{props.carried}</span>
      ) : (
        <span className={styles.time}>
          {formatAgo(props.now, workspace.updatedAt)}
        </span>
      )}
      <span className={ui.hidden}>
        , {listMarkLabel(workspace.github, workspace.state)}
      </span>
    </>
  )
}
