import { defined } from '../../defined'
import type { Org } from '../../fixtures/orgs'
import type { Membership } from '../../fixtures/members'
import {
  paletteShortcut,
  type ShortcutChanges,
} from '../../fixtures/shortcutChanges'
import { paths } from '../../paths'
import { classes } from '../../../../../src/ui/components/common/classes'
import { loadFailure } from '../../entries/components/common/LoadFailure.mockup'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { useSidebarToggle } from '../layout/sidebarPlace'
import type { ListQueue } from './queueList'
import type { RowFocus } from './rowControls'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
  WorkspaceRow,
} from './sections'
import { sectionList } from '../../entries/components/workspaces/SectionList.mockup'
import {
  newWorkspaceLink,
  automationsLink,
  searchLink,
  settingsLink,
} from '../../entries/components/workspaces/SidebarLinks.mockup'
import styles from '../../../../../src/ui/components/workspaces/Sidebar.module.css'

/**
 * The desktop sidebar beside the org rail: the org name with its Settings
 * cog, New workspace, Automations, Search, and the sections of the org.
 * A suspended org keeps Automations and Search, with read-only sections.
 * A list that did not load shows its failure in place of the sections.
 * In the browser the sidebar toggle sits beside the cog. It hides the
 * sidebar, or it shows it again from the popover of the hidden sidebar.
 * An open menu of a row may pass the edge of the sidebar. The props of
 * `ListQueue` add the Merge queue group above the sections.
 */
export function Sidebar(
  props: {
    org: Org
    sections: readonly SidebarSection[]
    /** The page that the main area shows, when the sidebar links to it. */
    current?: 'settings' | 'new-workspace' | 'automations'
    /** A build of the org's cloud computer failed. */
    settingsAlert?: boolean
    /** The New workspace page of the org, such as that of a new org. */
    newWorkspaceTo?: string
    menu?: ListMenu
    drag?: ListDrag
    /** The archived workspaces, which show in an open Archived group. */
    archived?: readonly WorkspaceRow[]
    /** The Archived group shows collapsed, with its count. */
    archivedCollapsed?: boolean
    /** The row whose menu, field, or hover the view draws. */
    focus?: RowFocus
    /** The operator suspended the org. */
    suspended?: boolean
    /** The workspace list of the org did not load. */
    failed?: boolean
    viewer: Membership
    /** The person's changes to the shortcuts, such as another palette key. */
    shortcuts?: ShortcutChanges
  } & ListQueue,
) {
  const suspended = props.suspended ?? false
  const drawing = props.focus?.drawing.kind
  const toggle = useSidebarToggle()
  return (
    <>
      <div className={styles.top}>
        <h2 className={styles.org}>{props.org.name}</h2>
        <settingsLink.Component
          current={props.current === 'settings'}
          {...defined({
            alert: props.settingsAlert,
            to: suspended ? paths.suspendedSettings : undefined,
          })}
        />
        {toggle ? (
          <iconButton.Component
            icon="panel-left"
            label={toggle === 'show' ? 'Show the sidebar' : 'Hide the sidebar'}
            moklyInstance="sidebar-toggle"
          />
        ) : null}
      </div>
      <div
        className={classes(
          styles.scroll,
          drawing === 'menu' && styles.unclipped,
        )}
        data-mokly-scroll="workspace-list"
      >
        <div className={styles.links}>
          {suspended ? null : (
            <newWorkspaceLink.Component
              current={props.current === 'new-workspace'}
              variant="sidebar"
              {...defined({ to: props.newWorkspaceTo })}
            />
          )}
          <automationsLink.Component
            current={props.current === 'automations'}
            variant="sidebar"
            {...defined({
              to: suspended ? paths.suspendedAutomations : undefined,
            })}
          />
          <searchLink.Component
            variant="sidebar"
            {...defined({ shortcut: paletteShortcut(props.shortcuts) })}
          />
        </div>
        {props.failed ? (
          <loadFailure.Component title="The workspaces didn't load" />
        ) : (
          <sectionList.Component
            readOnly={suspended}
            sections={props.sections}
            variant="sidebar"
            viewer={props.viewer}
            {...defined({
              archived: props.archived,
              archivedCollapsed: props.archivedCollapsed,
              drag: props.drag,
              menu: props.menu,
              focus: props.focus,
              queue: props.queue,
              queueDrag: props.queueDrag,
              queueable: props.queueable,
            })}
          />
        )}
      </div>
    </>
  )
}
