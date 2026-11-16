import { ChevronDown } from 'lucide-react'
import { ScreenLink } from '../components/common/ScreenLink'
import { actionButton } from '../entries/components/common/actions.mockup'
import { defined } from '../defined'
import a11y from '../components/common/a11y.module.css'
import { emptyState } from '../entries/components/common/EmptyState.mockup'
import { loadFailure } from '../entries/components/common/LoadFailure.mockup'
import { appFrame } from '../entries/components/layout/AppFrame.mockup'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import responsive from '../components/layout/responsive.module.css'
import { OrgTile } from '../components/orgs/OrgTile'
import {
  SuspendedOrgAbove,
  SuspendedOrgNotice,
  SuspendedOrgPanel,
} from '../components/orgs/SuspendedOrgNotice'
import type { RowFocus } from '../components/workspaces/rowControls'
import type { MenuStyle } from '../components/workspaces/SectionList'
import { SectionList } from '../components/workspaces/SectionList'
import {
  suspendedSections,
  type ListDrag,
  type ListMenu,
  type SidebarSection,
  type WorkspaceRow,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import {
  NewWorkspaceLink,
  RoutinesLink,
  SearchLink,
  SettingsLink,
} from '../components/workspaces/SidebarLinks'
import { deletedOrg, orgs, suspendedOrg, type Org } from '../fixtures/orgs'
import type { Membership } from '../fixtures/members'
import { paletteShortcut } from '../fixtures/shortcutChanges'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

/**
 * The action that starts a new workspace, in an empty main area. `to` is
 * the New workspace page of the org.
 */
function NewWorkspaceAction(props: { to?: string }) {
  return (
    <ScreenLink asChild to={props.to ?? paths.newWorkspace}>
      <actionButton.Component
        icon="plus"
        moklyInstance="new-workspace"
        tone="primary"
      >
        New workspace
      </actionButton.Component>
    </ScreenLink>
  )
}

/**
 * The header of the list page on a phone. A phone has no rail, so the org
 * name opens the org switcher. A deleted org has no settings to open.
 * `settingsTo` is the page of the settings, such as those of a suspended
 * org.
 */
export function ListHeader(props: {
  org: Org
  settings?: boolean
  settingsTo?: string
}) {
  return (
    <header className={styles.header}>
      <ScreenLink className={styles.switcher} to={paths.orgs}>
        <OrgTile current org={props.org} size={24} />
        <span className={a11y.hidden}>Switch org: </span>
        <span className={styles.orgName}>{props.org.name}</span>
        <ChevronDown aria-hidden className={styles.chevron} size={15} />
      </ScreenLink>
      {props.settings === false ? null : <SettingsLink to={props.settingsTo} />}
    </header>
  )
}

/**
 * The workspace list as a page: on a phone, and in a narrow window. A
 * suspended org shows its notice first, and no New workspace and no
 * section menus, because nothing in it can change. Its Routines link
 * stays. Search opens the command palette. Its key shows only in a
 * desktop window. A list that did not load shows its failure in place of
 * the sections.
 * `newWorkspaceTo` is the New workspace page of the org, such as that
 * of a new org. `focus` names the row whose menu, field, or hover the view
 * draws.
 */
export function HomeList(props: {
  org: Org
  sections: readonly SidebarSection[]
  viewer: Membership
  menu?: ListMenu
  menuStyle: MenuStyle
  drag?: ListDrag
  suspended?: boolean
  newWorkspaceTo?: string
  /** Show ⌘K, the key of the palette, beside Search. */
  keys?: boolean
  /** The workspace list of the org did not load. */
  failed?: boolean
  focus?: RowFocus
  /** The archived workspaces, in the Archived group at the end. */
  archived?: readonly WorkspaceRow[]
  /** The Archived group shows collapsed, with its count. */
  archivedCollapsed?: boolean
}) {
  const suspended = props.suspended ?? false
  return (
    <>
      <ListHeader
        org={props.org}
        settingsTo={suspended ? paths.suspendedSettings : undefined}
      />
      <div className={styles.scroll} data-mokly-scroll="workspace-page">
        {suspended ? <SuspendedOrgNotice org={props.org} /> : null}
        <div className={styles.links}>
          {suspended ? null : (
            <NewWorkspaceLink to={props.newWorkspaceTo} variant="page" />
          )}
          <RoutinesLink
            to={suspended ? paths.suspendedRoutines : undefined}
            variant="page"
          />
          <SearchLink
            shortcut={props.keys ? paletteShortcut() : undefined}
            variant="page"
          />
        </div>
        {props.failed ? (
          <loadFailure.Component
            moklyInstance="list-load-failure"
            title="The workspaces didn't load"
          />
        ) : (
          <SectionList
            archived={props.archived}
            archivedCollapsed={props.archivedCollapsed}
            drag={props.drag}
            focus={props.focus}
            menu={props.menu}
            menuStyle={props.menuStyle}
            readOnly={suspended}
            sections={props.sections}
            variant="page"
            viewer={props.viewer}
          />
        )}
      </div>
    </>
  )
}

/**
 * The list of a suspended org on desktop. The main area shows the notice
 * of the org in place of New workspace. A narrow window shows the list as
 * a page, with the notice at its top. The menu of each row holds only Copy
 * link. `focus` names the row whose menu or hover the view draws. `rail` is
 * the rail before the org shows as suspended in it, such as a rail in the
 * middle of a reorder.
 */
export function SuspendedList(props: {
  viewer: Membership
  focus?: RowFocus
  sections?: readonly SidebarSection[]
  rail?: RailState
}) {
  const org = orgs[suspendedOrg]
  const sections = props.sections ?? suspendedSections()
  return (
    <appFrame.Component
      rail={{ ...(props.rail ?? acmeRail), suspended: suspendedOrg }}
      sidebar={
        <Sidebar
          focus={props.focus}
          org={org}
          sections={sections}
          suspended
          viewer={props.viewer}
        />
      }
    >
      <div className={`${responsive.wideOnly} ${styles.choose}`}>
        <SuspendedOrgPanel org={org} />
      </div>
      <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
        <HomeList
          focus={props.focus}
          keys
          menuStyle="anchored"
          org={org}
          sections={sections}
          suspended
          viewer={props.viewer}
        />
      </div>
    </appFrame.Component>
  )
}

/** The main area of a desktop list: the user picks a workspace. */
export function ChooseWorkspace() {
  return (
    <emptyState.Component
      action={<NewWorkspaceAction />}
      icon="panel-left"
      moklyInstance="choose-workspace"
      title="Choose a workspace"
    />
  )
}

/** A new org and the repositories that it chose. */
export type NewOrg = {
  name: string
  repositories: readonly { name: string; used: boolean }[]
}

/**
 * The main area of a new org, which has no workspaces yet. `newWorkspaceTo`
 * is the New workspace page of the org.
 */
export function NewOrgEmpty(props: { org: NewOrg; newWorkspaceTo?: string }) {
  const { org } = props
  const used = org.repositories.filter((item) => item.used)
  return (
    <emptyState.Component
      action={<NewWorkspaceAction to={props.newWorkspaceTo} />}
      body={`Workspaces of ${org.name} start in ${used.map((item) => item.name).join(' or ')}.`}
      icon="plus"
      moklyInstance="new-org-empty"
      title={`Start the first workspace in ${org.name}`}
    />
  )
}

/**
 * The page of an org that an admin deleted. Its cloud computers are
 * stopped and its members cannot open it. An admin restores it until the
 * date when everything is deleted. A suspended org refuses a restore, so
 * its page offers none, and the notice of the org shows above the date.
 */
export function DeletedOrg(props: { suspended?: boolean }) {
  const org = orgs[deletedOrg.org]
  const facts =
    "Its cloud computers are stopped, and its members can't open it."
  const page = (
    <emptyState.Component
      moklyInstance="deleted-org"
      {...defined({
        action: props.suspended ? undefined : (
          <ScreenLink asChild to={paths.shell}>
            <actionButton.Component
              icon="archive-restore"
              moklyInstance="restore-org"
              tone="primary"
            >
              {`Restore ${org.name}`}
            </actionButton.Component>
          </ScreenLink>
        ),
      })}
      body={
        props.suspended
          ? facts
          : `${facts} Restore it to bring back its workspaces, chats, and settings.`
      }
      icon="archive-restore"
      title={`${org.name} is deleted on ${deletedOrg.deletes}`}
    />
  )
  if (!props.suspended) return page
  return <SuspendedOrgAbove org={org}>{page}</SuspendedOrgAbove>
}
