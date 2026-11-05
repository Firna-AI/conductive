import type { Org } from '../../fixtures/orgs'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { SectionList } from './SectionList'
import { NewWorkspaceLink, SettingsLink } from './SidebarLinks'
import styles from './Sidebar.module.css'

/**
 * The desktop sidebar beside the org rail: the org name with its Settings
 * link, New workspace, and the sections of the org.
 */
export function Sidebar(props: {
  org: Org
  sections: readonly SidebarSection[]
  /** The page that the main area shows, when the sidebar links to it. */
  current?: 'settings' | 'new-workspace'
  /** A build of the org's cloud computer failed. */
  settingsAlert?: boolean
  menu?: ListMenu
  drag?: ListDrag
  /** The archived workspaces, which show in an open Archived group. */
  archived?: readonly WorkspaceRow[]
}) {
  return (
    <>
      <div className={styles.top}>
        <h2 className={styles.org}>{props.org.name}</h2>
        <SettingsLink
          alert={props.settingsAlert}
          current={props.current === 'settings'}
        />
      </div>
      <div className={styles.scroll} data-mokly-scroll="workspace-list">
        <NewWorkspaceLink
          current={props.current === 'new-workspace'}
          variant="sidebar"
        />
        <SectionList
          archived={props.archived}
          drag={props.drag}
          menu={props.menu}
          sections={props.sections}
          variant="sidebar"
        />
      </div>
    </>
  )
}
