import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { paletteViews } from '../components/palette/paletteViews'
import type { RailState } from '../components/layout/OrgRail'
import responsive from '../components/layout/responsive.module.css'
import {
  newOrgSections,
  suspendedSections,
  workspaceSections,
  type SidebarSection,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { viewerMembership } from '../fixtures/members'
import { deletedOrg, orgList, orgs, suspendedOrg } from '../fixtures/orgs'
import {
  ChooseWorkspace,
  DeletedOrg,
  HomeList,
  ListHeader,
  NewOrgEmpty,
  SuspendedList,
} from './listParts'
import {
  listDrag,
  listMenu,
  listPalette,
  listRail,
  listSheet,
  newOrgs,
} from './listStates'
import {
  isWorkspaceMenuState,
  workspaceMenuStates,
} from './workspaceMenuStates'
import {
  generalOnlySections,
  menuListView,
  type MenuListView,
} from './workspaceMenuView'
import styles from './WorkspaceListScreen.module.css'

export const workspaceListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'menu', 'palette'],
  properties: {
    /**
     * The workspaces of Acme, Acme with only the General section, the
     * first org of a new user or another new org, both without workspaces,
     * a deleted org, Acme after the operator suspended it, a deleted org
     * that the operator suspended, or Acme after its list did not load.
     */
    list: {
      enum: [
        'workspaces',
        'general-only',
        'new-org',
        'another-org',
        'deleted',
        'suspended',
        'deleted-suspended',
        'failed',
      ],
    },
    /**
     * The menu of a section, a workspace dragged, the org switcher, or
     * the org switcher of an operator, which adds Operator. Or a state of
     * the menu of a workspace row, which the lists of Acme draw.
     */
    menu: {
      enum: [
        'none',
        'section',
        'drag',
        'orgs',
        'operator',
        ...workspaceMenuStates,
      ],
    },
    /** The command palette, closed or open on one of its views. */
    palette: { enum: paletteViews },
  },
} as const

export type WorkspaceListState = SchemaProps<typeof workspaceListSchema>

/** Cal, an admin of each org, who looks at the lists of these views. */
const viewer = viewerMembership('admin')

/** The sections of a list before any state changes them. */
function sectionsOf(list: WorkspaceListState['list']): SidebarSection[] {
  if (list === 'general-only') return generalOnlySections()
  if (list === 'suspended') return suspendedSections()
  return newOrgs[list] ? newOrgSections() : workspaceSections()
}

/** The list and what lies over it, in a state of the menu of a row. */
function rowMenuView(
  state: WorkspaceListState,
  viewport: Viewport,
): MenuListView | undefined {
  const { list, menu } = state
  if (!isWorkspaceMenuState(menu)) return undefined
  if (list !== 'workspaces' && list !== 'general-only' && list !== 'suspended')
    return undefined
  return menuListView(menu, list, viewport)
}

function MobileList(props: { state: WorkspaceListState }) {
  const { list, menu, palette } = props.state
  // On a phone the palette is a page in place of the list.
  if (palette !== 'closed') {
    return <MobileFrame>{listPalette(palette, 'mobile')}</MobileFrame>
  }
  if (list === 'deleted' || list === 'deleted-suspended') {
    return (
      <MobileFrame>
        <ListHeader org={orgs[deletedOrg.org]} settings={false} />
        <DeletedOrg suspended={list === 'deleted-suspended'} />
      </MobileFrame>
    )
  }
  const view = rowMenuView(props.state, 'mobile')
  const sections = view?.sections ?? sectionsOf(list)
  if (list === 'suspended') {
    // A suspended org has no section menus, so only the org switcher opens.
    return (
      <MobileFrame>
        <HomeList
          focus={view?.focus}
          menuStyle="sheet"
          org={orgs[suspendedOrg]}
          sections={sections}
          suspended
          viewer={view?.viewer ?? viewer}
        />
        {menu === 'orgs' ? listSheet(menu) : null}
      </MobileFrame>
    )
  }
  const fresh = newOrgs[list]
  return (
    <MobileFrame>
      <HomeList
        archived={view?.archived}
        archivedCollapsed={view?.archivedCollapsed}
        drag={listDrag(menu)}
        failed={list === 'failed'}
        focus={view?.focus}
        menu={listMenu(menu)}
        menuStyle="sheet"
        newWorkspaceTo={fresh?.newWorkspaceTo}
        org={fresh ? fresh.org : orgs.acme}
        sections={sections}
        viewer={view?.viewer ?? viewer}
      />
      {view ? view.over : listSheet(menu)}
    </MobileFrame>
  )
}

/**
 * The workspace list of an org, grouped in the sections that the user made.
 * On a phone and in a narrow window it is the home screen. On a wide
 * desktop the list is the sidebar, and the main area waits for a choice.
 * A right click on a row, or the menu keys, opens the menu of the row.
 */
export function WorkspaceListScreen(props: {
  state: WorkspaceListState
  viewport: Viewport
}) {
  const { list, menu, palette } = props.state
  if (props.viewport === 'mobile') return <MobileList state={props.state} />
  const view = rowMenuView(props.state, props.viewport)
  if (list === 'suspended') {
    return (
      <SuspendedList
        focus={view?.focus}
        sections={view?.sections}
        viewer={view?.viewer ?? viewer}
      />
    )
  }
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
            viewer={viewer}
          />
        }
      >
        <NewOrgEmpty newWorkspaceTo={fresh.newWorkspaceTo} org={fresh.form} />
      </AppFrame>
    )
  }
  const listed = {
    archived: view?.archived,
    archivedCollapsed: view?.archivedCollapsed,
    drag: listDrag(menu),
    failed: list === 'failed',
    menu: listMenu(menu),
    focus: view?.focus,
    org: orgs.acme,
    sections: view?.sections ?? sectionsOf(list),
    viewer: view?.viewer ?? viewer,
  }
  return (
    <AppFrame
      overlay={listPalette(palette, props.viewport) ?? view?.over}
      rail={view?.rail ?? listRail(menu)}
      sidebar={<Sidebar {...listed} />}
    >
      <div className={`${responsive.wideOnly} ${styles.choose}`}>
        <ChooseWorkspace />
      </div>
      <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
        <HomeList {...listed} keys menuStyle="anchored" />
      </div>
    </AppFrame>
  )
}
