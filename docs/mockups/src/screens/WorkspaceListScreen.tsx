import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import responsive from '../components/layout/responsive.module.css'
import { SuspendedOrgPanel } from '../components/orgs/SuspendedOrgNotice'
import {
  newOrgSections,
  suspendedSections,
  workspaceSections,
  type ListDrag,
  type ListMenu,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import {
  deletedOrg,
  orgList,
  orgListWithLabs,
  orgs,
  suspendedOrg,
  type Org,
} from '../fixtures/orgs'
import { anotherOrg, newOrg } from '../fixtures/repositories'
import { menuSection } from '../fixtures/sections'
import { workspaceDrag } from '../fixtures/workspaces'
import { paths } from '../paths'
import {
  ChooseWorkspace,
  DeletedOrg,
  HomeList,
  ListHeader,
  NewOrgEmpty,
  type NewOrg,
} from './listParts'
import { OrgSwitcherSheet, SectionSheet } from './listSheets'
import styles from './WorkspaceListScreen.module.css'

export const workspaceListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'menu'],
  properties: {
    /**
     * The workspaces of Acme, the first org of a new user or another new
     * org, both without workspaces, a deleted org, Acme after the operator
     * suspended it, or a deleted org that the operator suspended.
     */
    list: {
      enum: [
        'workspaces',
        'new-org',
        'another-org',
        'deleted',
        'suspended',
        'deleted-suspended',
      ],
    },
    /** The menu of a section, a workspace dragged, or the org switcher. */
    menu: { enum: ['none', 'section', 'drag', 'orgs'] },
  },
} as const

export type WorkspaceListState = SchemaProps<typeof workspaceListSchema>

function listMenu(menu: WorkspaceListState['menu']): ListMenu | undefined {
  return menu === 'section' ? { section: menuSection } : undefined
}

function listDrag(menu: WorkspaceListState['menu']): ListDrag | undefined {
  return menu === 'drag' ? workspaceDrag : undefined
}

const sheets: Readonly<Record<WorkspaceListState['menu'], ReactNode>> = {
  none: null,
  section: <SectionSheet />,
  drag: null,
  orgs: <OrgSwitcherSheet current="acme" />,
}

/**
 * A new org before its first workspace, and its New workspace page. The
 * mockups draw the first build of Firna on its own New workspace page.
 */
type FreshOrg = {
  org: Org
  rail: readonly Org[]
  form: NewOrg
  newWorkspaceTo: string
}

/**
 * The new orgs before their first workspace: the first org of the sign-up,
 * and another org that Create org made beside the user's orgs.
 */
const newOrgs: Readonly<Partial<Record<WorkspaceListState['list'], FreshOrg>>> =
  {
    'new-org': {
      org: orgs.firna,
      rail: orgList,
      form: newOrg,
      newWorkspaceTo: paths.firstBuildWorkspace,
    },
    'another-org': {
      org: orgs.labs,
      rail: orgListWithLabs,
      form: anotherOrg,
      newWorkspaceTo: paths.newWorkspace,
    },
  }

function MobileList(props: { state: WorkspaceListState }) {
  const { list, menu } = props.state
  if (list === 'deleted' || list === 'deleted-suspended') {
    return (
      <MobileFrame>
        <ListHeader org={orgs[deletedOrg.org]} settings={false} />
        <DeletedOrg suspended={list === 'deleted-suspended'} />
      </MobileFrame>
    )
  }
  if (list === 'suspended') {
    // A suspended org has no section menus, so only the org switcher opens.
    return (
      <MobileFrame>
        <HomeList
          menuStyle="sheet"
          org={orgs[suspendedOrg]}
          sections={suspendedSections()}
          suspended
        />
        {menu === 'orgs' ? sheets.orgs : null}
      </MobileFrame>
    )
  }
  const fresh = newOrgs[list]
  return (
    <MobileFrame>
      <HomeList
        drag={listDrag(menu)}
        menu={listMenu(menu)}
        menuStyle="sheet"
        newWorkspaceTo={fresh?.newWorkspaceTo}
        org={fresh ? fresh.org : orgs.acme}
        sections={fresh ? newOrgSections() : workspaceSections()}
      />
      {sheets[menu]}
    </MobileFrame>
  )
}

/**
 * The list of a suspended org on desktop. The main area shows the notice
 * of the org in place of New workspace. A narrow window shows the list as
 * a page, with the notice at its top.
 */
function SuspendedList() {
  const org = orgs[suspendedOrg]
  const sections = suspendedSections()
  return (
    <AppFrame
      rail={{ ...acmeRail, suspended: suspendedOrg }}
      sidebar={<Sidebar org={org} sections={sections} suspended />}
    >
      <div className={`${responsive.wideOnly} ${styles.choose}`}>
        <SuspendedOrgPanel org={org} />
      </div>
      <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
        <HomeList
          menuStyle="anchored"
          org={org}
          sections={sections}
          suspended
        />
      </div>
    </AppFrame>
  )
}

/**
 * The workspace list of an org, grouped in the sections that the user made.
 * On a phone and in a narrow window it is the home screen. On a wide
 * desktop the list is the sidebar, and the main area waits for a choice.
 */
export function WorkspaceListScreen(props: {
  state: WorkspaceListState
  viewport: Viewport
}) {
  const { list, menu } = props.state
  if (props.viewport === 'mobile') return <MobileList state={props.state} />
  if (list === 'suspended') return <SuspendedList />
  if (list === 'deleted' || list === 'deleted-suspended') {
    const rail: RailState = {
      orgs: orgList,
      current: deletedOrg.org,
      deleted: deletedOrg.org,
    }
    return (
      <AppFrame rail={rail}>
        <DeletedOrg suspended={list === 'deleted-suspended'} />
      </AppFrame>
    )
  }
  const fresh = newOrgs[list]
  if (fresh) {
    const rail: RailState = { orgs: fresh.rail, current: fresh.org.key }
    return (
      <AppFrame
        rail={rail}
        sidebar={
          <Sidebar
            newWorkspaceTo={fresh.newWorkspaceTo}
            org={fresh.org}
            sections={newOrgSections()}
          />
        }
      >
        <NewOrgEmpty newWorkspaceTo={fresh.newWorkspaceTo} org={fresh.form} />
      </AppFrame>
    )
  }
  const sections = workspaceSections()
  const open = listMenu(menu)
  const drag = listDrag(menu)
  const rail: RailState =
    menu === 'orgs' ? { ...acmeRail, hint: 'futex' } : acmeRail
  return (
    <AppFrame
      rail={rail}
      sidebar={
        <Sidebar drag={drag} menu={open} org={orgs.acme} sections={sections} />
      }
    >
      <div className={`${responsive.wideOnly} ${styles.choose}`}>
        <ChooseWorkspace />
      </div>
      <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
        <HomeList
          drag={drag}
          menu={open}
          menuStyle="anchored"
          org={orgs.acme}
          sections={sections}
        />
      </div>
    </AppFrame>
  )
}
