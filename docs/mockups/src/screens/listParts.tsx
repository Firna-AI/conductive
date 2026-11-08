import { ArchiveRestore, ChevronDown, PanelLeft, Plus } from 'lucide-react'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import a11y from '../components/common/a11y.module.css'
import { EmptyState } from '../components/common/EmptyState'
import { OrgTile } from '../components/orgs/OrgTile'
import {
  SuspendedOrgAbove,
  SuspendedOrgNotice,
} from '../components/orgs/SuspendedOrgNotice'
import type { MenuStyle } from '../components/workspaces/SectionList'
import { SectionList } from '../components/workspaces/SectionList'
import type {
  ListDrag,
  ListMenu,
  SidebarSection,
} from '../components/workspaces/sections'
import {
  NewWorkspaceLink,
  SettingsLink,
} from '../components/workspaces/SidebarLinks'
import { deletedOrg, orgs, type Org } from '../fixtures/orgs'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

/** The action that starts a new workspace, in an empty main area. */
const newWorkspaceAction = (
  <ScreenLink asChild to={paths.newWorkspace}>
    <ActionButton icon={Plus} tone="primary">
      New workspace
    </ActionButton>
  </ScreenLink>
)

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
 * section menus, because nothing in it can change.
 */
export function HomeList(props: {
  org: Org
  sections: readonly SidebarSection[]
  menu?: ListMenu
  menuStyle: MenuStyle
  drag?: ListDrag
  suspended?: boolean
}) {
  const suspended = props.suspended ?? false
  return (
    <>
      <ListHeader
        org={props.org}
        settingsTo={suspended ? paths.suspendedSettings : undefined}
      />
      <div className={styles.scroll} data-mokly-scroll="workspace-page">
        {suspended ? (
          <SuspendedOrgNotice org={props.org} />
        ) : (
          <NewWorkspaceLink variant="page" />
        )}
        <SectionList
          drag={props.drag}
          menu={props.menu}
          menuStyle={props.menuStyle}
          readOnly={suspended}
          sections={props.sections}
          variant="page"
        />
      </div>
    </>
  )
}

/** The main area of a desktop list: the user picks a workspace. */
export function ChooseWorkspace() {
  return (
    <EmptyState
      action={newWorkspaceAction}
      icon={PanelLeft}
      title="Choose a workspace"
    />
  )
}

/** A new org and the repositories that it chose. */
export type NewOrg = {
  name: string
  repositories: readonly { name: string; used: boolean }[]
}

/** The main area of a new org, which has no workspaces yet. */
export function NewOrgEmpty(props: { org: NewOrg }) {
  const { org } = props
  const used = org.repositories.filter((item) => item.used)
  return (
    <EmptyState
      action={newWorkspaceAction}
      body={`Workspaces of ${org.name} start in ${used.map((item) => item.name).join(' or ')}.`}
      icon={Plus}
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
    <EmptyState
      action={
        props.suspended ? undefined : (
          <ScreenLink asChild to={paths.shell}>
            <ActionButton icon={ArchiveRestore} tone="primary">
              {`Restore ${org.name}`}
            </ActionButton>
          </ScreenLink>
        )
      }
      body={
        props.suspended
          ? facts
          : `${facts} Restore it to bring back its workspaces, chats, and settings.`
      }
      icon={ArchiveRestore}
      title={`${org.name} is deleted on ${deletedOrg.deletes}`}
    />
  )
  if (!props.suspended) return page
  return <SuspendedOrgAbove org={org}>{page}</SuspendedOrgAbove>
}
