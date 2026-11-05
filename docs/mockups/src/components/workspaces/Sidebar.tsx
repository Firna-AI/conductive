import type { WorkspaceGroup } from './groups'
import { WorkspaceGroups } from './WorkspaceGroups'
import styles from './Sidebar.module.css'

/**
 * The desktop sidebar beside the icon rail: the workspace list, grouped by
 * repository. The rail holds the app actions.
 */
export function Sidebar(props: { groups: readonly WorkspaceGroup[] }) {
  return (
    <>
      <div className={styles.top}>
        <h2 className={styles.title}>Workspaces</h2>
      </div>
      <div className={styles.scroll} data-mokly-scroll="workspace-list">
        <WorkspaceGroups groups={props.groups} variant="sidebar" />
      </div>
    </>
  )
}
