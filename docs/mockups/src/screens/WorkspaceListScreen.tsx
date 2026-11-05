import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import responsive from '../components/layout/responsive.module.css'
import {
  newOrgSections,
  workspaceSections,
  type ListDrag,
  type ListMenu,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { deletedOrg, orgList, orgs } from '../fixtures/orgs'
import { menuSection } from '../fixtures/sections'
import { workspaceDrag } from '../fixtures/workspaces'
import {
  ChooseWorkspace,
  DeletedOrg,
  HomeList,
  ListHeader,
  NewOrgEmpty,
} from './listParts'
import { OrgSwitcherSheet, SectionSheet } from './listSheets'
import styles from './WorkspaceListScreen.module.css'

export const workspaceListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'menu'],
  properties: {
    /** The workspaces of Acme, a new org without any, or a deleted org. */
    list: { enum: ['workspaces', 'new-org', 'deleted'] },
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

function MobileList(props: { state: WorkspaceListState }) {
  const { list, menu } = props.state
  if (list === 'deleted') {
    return (
      <MobileFrame>
        <ListHeader org={orgs[deletedOrg.org]} settings={false} />
        <DeletedOrg />
      </MobileFrame>
    )
  }
  const firna = list === 'new-org'
  return (
    <MobileFrame>
      <HomeList
        drag={listDrag(menu)}
        menu={listMenu(menu)}
        menuStyle="sheet"
        org={firna ? orgs.firna : orgs.acme}
        sections={firna ? newOrgSections() : workspaceSections()}
      />
      {sheets[menu]}
    </MobileFrame>
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
  if (list === 'deleted') {
    const rail: RailState = {
      orgs: orgList,
      current: deletedOrg.org,
      deleted: deletedOrg.org,
    }
    return (
      <AppFrame rail={rail}>
        <DeletedOrg />
      </AppFrame>
    )
  }
  if (list === 'new-org') {
    const rail: RailState = { orgs: orgList, current: 'firna' }
    return (
      <AppFrame
        rail={rail}
        sidebar={<Sidebar org={orgs.firna} sections={newOrgSections()} />}
      >
        <NewOrgEmpty />
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
