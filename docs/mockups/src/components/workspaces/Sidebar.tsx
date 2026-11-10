import type { Org } from '../../fixtures/orgs'
import type { Membership } from '../../fixtures/members'
import { paths } from '../../paths'
import { LoadFailure } from '../common/LoadFailure'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { SectionList } from './SectionList'
import { NewWorkspaceLink, SearchLink, SettingsLink } from './SidebarLinks'
import styles from './Sidebar.module.css'

/**
 * The desktop sidebar beside the org rail: the org name with its Settings
 * link, New workspace, Search, and the sections of the org. A suspended org
 * shows its sections without New workspace and without their menus,
 * because nothing in it can change. A list that did not load shows its
 * failure in place of the sections.
 */
export function Sidebar(props: {
  org: Org
  sections: readonly SidebarSection[]
  /** The page that the main area shows, when the sidebar links to it. */
  current?: 'settings' | 'new-workspace'
  /** A build of the org's cloud computer failed. */
  settingsAlert?: boolean
  /** The New workspace page of the org, such as that of a new org. */
  newWorkspaceTo?: string
  menu?: ListMenu
  drag?: ListDrag
  /** The archived workspaces, which show in an open Archived group. */
  archived?: readonly WorkspaceRow[]
  /** The operator suspended the org. */
  suspended?: boolean
  /** The workspace list of the org did not load. */
  failed?: boolean
  viewer: Membership
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
        <div className={styles.links}>
          {suspended ? null : (
            <NewWorkspaceLink
              current={props.current === 'new-workspace'}
              to={props.newWorkspaceTo}
              variant="sidebar"
            />
          )}
          <SearchLink keys variant="sidebar" />
        </div>
        {props.failed ? (
          <LoadFailure title="The workspaces didn't load" />
        ) : (
          <SectionList
            archived={props.archived}
            drag={props.drag}
            menu={props.menu}
            readOnly={suspended}
            sections={props.sections}
            variant="sidebar"
            viewer={props.viewer}
          />
        )}
      </div>
    </>
  )
}
