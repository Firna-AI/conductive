import { MockLink } from '@mokly/mokly'
import { Building2, ChevronDown, PanelLeft, Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import a11y from '../components/common/a11y.module.css'
import { EmptyState } from '../components/common/EmptyState'
import { Mark } from '../components/common/Mark'
import { AccountAvatar, OrgTile } from '../components/orgs/OrgTile'
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
import type { Org } from '../fixtures/orgs'
import { newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

/** The action that starts a new workspace, in an empty main area. */
const newWorkspaceAction = (
  <MockLink asChild to={paths.newWorkspace}>
    <ActionButton icon={Plus} tone="primary">
      New workspace
    </ActionButton>
  </MockLink>
)

/**
 * The header of the list page on a phone. A phone has no rail, so the org
 * name opens the org switcher.
 */
function ListHeader(props: { org: Org }) {
  return (
    <header className={styles.header}>
      <MockLink className={styles.switcher} to={paths.orgs}>
        <OrgTile current org={props.org} size={24} />
        <span className={a11y.hidden}>Switch org: </span>
        <span className={styles.orgName}>{props.org.name}</span>
        <ChevronDown aria-hidden className={styles.chevron} size={15} />
      </MockLink>
      <SettingsLink />
    </header>
  )
}

/** The workspace list as a page: on a phone, and in a narrow window. */
export function HomeList(props: {
  org: Org
  sections: readonly SidebarSection[]
  menu?: ListMenu
  menuStyle: MenuStyle
  drag?: ListDrag
}) {
  return (
    <>
      <ListHeader org={props.org} />
      <div className={styles.scroll} data-mokly-scroll="workspace-page">
        <NewWorkspaceLink variant="page" />
        <SectionList
          drag={props.drag}
          menu={props.menu}
          menuStyle={props.menuStyle}
          sections={props.sections}
          variant="page"
        />
      </div>
    </>
  )
}

/**
 * The phone header before the first org: the mark, and the account, where
 * the user connects GitHub and the agents.
 */
export function FirstRunHeader() {
  return (
    <header className={styles.header}>
      <Mark />
      <h1 className={styles.title}>Get started</h1>
      <MockLink
        aria-label="Account"
        className={styles.account}
        to={paths.accountSetup}
      >
        <AccountAvatar size={26} />
      </MockLink>
    </header>
  )
}

/** The first run: the user creates their first org. */
export function FirstRun() {
  return (
    <EmptyState
      action={
        <MockLink asChild to={paths.createFirstOrg}>
          <ActionButton icon={Plus} tone="primary">
            Create org
          </ActionButton>
        </MockLink>
      }
      body="An org groups your workspaces with the repositories that they use and their sandbox settings."
      icon={Building2}
      title="Create your first org"
    />
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

/** The main area of a new org, which has no workspaces yet. */
export function NewOrgEmpty() {
  const used = newOrg.repositories.filter((item) => item.used)
  return (
    <EmptyState
      action={newWorkspaceAction}
      body={`Workspaces of ${newOrg.name} start in ${used.map((item) => item.name).join(' or ')}.`}
      icon={Plus}
      title={`Start the first workspace in ${newOrg.name}`}
    />
  )
}
