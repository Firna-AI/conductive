import type { Workspace } from '../../shared/generated/Workspace'
import { classes } from '../../ui/components/common/classes'
import { guideClasses } from '../../ui/components/workspaces/guideLines'
import { WorkspaceMark } from '../../ui/components/workspaces/WorkspaceMark'
import {
  WorkspaceName,
  type EmphasisClasses,
} from '../../ui/components/workspaces/WorkspaceName'
import styles from '../../ui/components/workspaces/WorkspaceRow.module.css'
import { listMarkLabel } from '../../ui/components/workspaces/status'
import { formatAgo } from '../../app/time'
import { nameLabel } from '../../shared/name-label'
import { MAX_WORKSPACE_DEPTH } from '../../shared/workspace-tree'
import type { TreeLines } from '../../shared/workspace-tree-lines'
import ui from '../ui/ui.module.css'

/**
 * The look of the name of a row in each state, as the mockups give it: ink
 * and the strong weight for unread output, ink while the agent works or
 * needs input, and the muted colour while the workspace is stopped or
 * archived.
 */
const nameEmphasis: EmphasisClasses = {
  strong: styles.strong,
  active: styles.active,
  dim: styles.dim,
}

/**
 * The classes of a row of a tree: the indent of each level that the list
 * shows above a nested row, and the guide lines of its tree from `lines`,
 * as the mockups draw them. A top-level row has only the stub under its
 * mark, when rows show under it.
 */
export function nestedClasses(
  depth: number,
  lines: TreeLines | undefined,
): string {
  const steps = Math.min(Math.max(depth, 0), MAX_WORKSPACE_DEPTH)
  return classes(
    steps > 0 && styles.nested,
    steps > 0 && styles[`indent${steps}`],
    guideClasses(steps, lines),
  )
}

/**
 * The mark, the name, and the time of a row. `WorkspaceName` gives the name
 * the look of the state, so bold alone marks unread output. A lifted row of
 * a tree shows the count of the nested rows that move with it, `carried`,
 * in place of its time. The count follows the name directly, so it takes
 * the strong weight of an unread name.
 */
export function RowContent(props: {
  workspace: Workspace
  now: number
  carried: number
}) {
  const { workspace } = props
  return (
    <>
      <WorkspaceMark
        github={workspace.github}
        messageWaiting={workspace.messageWaiting}
        status={workspace.state}
      />
      <WorkspaceName
        className={styles.name}
        emphasis={nameEmphasis}
        status={workspace.state}
      >
        {nameLabel(workspace.name)}
      </WorkspaceName>
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
