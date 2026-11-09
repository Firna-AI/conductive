import type { Org } from '../../fixtures/orgs'
import { paths } from '../../paths'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { SectionList } from './SectionList'
import { NewWorkspaceLink, RoutinesLink, SettingsLink } from './SidebarLinks'
import styles from './Sidebar.module.css'

/**
 * The desktop sidebar beside the org rail: the org name with its Settings
 * link, New workspace, Routines, and the sections of the org. A suspended
 * org shows its sections without New workspace, Routines, and their menus,
 * because nothing in it can change.
 */
export function Sidebar(props: {
  org: Org
  sections: readonly SidebarSection[]
  /** The page that the main area shows, when the sidebar links to it. */
  current?: 'settings' | 'new-workspace' | 'routines'
  /** A build of the org's cloud computer failed. */
  settingsAlert?: boolean
  menu?: ListMenu
  drag?: ListDrag
  /** The archived workspaces, which show in an open Archived group. */
  archived?: readonly WorkspaceRow[]
  /** The operator suspended the org. */
  suspended?: boolean
}) {
  const suspended = props.suspended ?? false
  return (
    <>
      <div className={styles.top}>
        <h2 className={styles.org}>{props.org.name}</h2>
        <SettingsLink
          alert={props.settingsAlert}
          current={props.current === 'settings'}
          to={suspended ? paths.suspendedSettings : undefined}
        />
      </div>
      <div className={styles.scroll} data-mokly-scroll="workspace-list">
        {suspended ? null : (
          <div className={styles.links}>
            <NewWorkspaceLink
              current={props.current === 'new-workspace'}
              variant="sidebar"
            />
            <RoutinesLink
              current={props.current === 'routines'}
              variant="sidebar"
            />
          </div>
        )}
        <SectionList
          archived={props.archived}
          drag={props.drag}
          menu={props.menu}
          readOnly={suspended}
          sections={props.sections}
          variant="sidebar"
        />
      </div>
    </>
  )
}
