import { workspaceOf } from '../../fixtures/issueWorkspaces'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { listMarkLabel } from '../workspaces/status'
import { WorkspaceMark } from '../workspaces/WorkspaceMark'
import { workspaceLabel } from '../workspaces/label'
import styles from './LinkedWorkspace.module.css'

/**
 * A workspace of an issue, as a small pill: its list mark, live, and its
 * label, such as `W-395`. `named` adds its name, for a wider place.
 */
export function LinkedWorkspace(props: { workspace: string; named?: boolean }) {
  const workspace = workspaceOf(props.workspace)
  return (
    <span
      className={classes(styles.pill, props.named && styles.named)}
      title={workspace.name}
    >
      <WorkspaceMark github={workspace.github} status={workspace.status} />
      <span className={styles.label}>{workspaceLabel(workspace.number)}</span>
      {props.named ? (
        <span className={styles.name}>{workspace.name}</span>
      ) : null}
      <span className={a11y.hidden}>
        , {listMarkLabel(workspace.github, workspace.status)}
      </span>
    </span>
  )
}

/** The workspaces of an issue, as pills in one line. */
export function LinkedWorkspaces(props: { workspaces: readonly string[] }) {
  if (props.workspaces.length === 0) return null
  return (
    <span className={styles.pills}>
      {props.workspaces.map((key) => (
        <LinkedWorkspace key={key} workspace={key} />
      ))}
    </span>
  )
}
