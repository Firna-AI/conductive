import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { paletteViews } from '../components/palette/paletteViews'
import type { RailState } from '../components/layout/OrgRail'
import responsive from '../components/layout/responsive.module.css'
import {
  archivedGroup,
  newOrgSections,
  suspendedSections,
  workspaceSections,
  type SidebarSection,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { viewerMembership } from '../fixtures/members'
import { deletedOrg, orgList, orgs, suspendedOrg } from '../fixtures/orgs'
import { checkoutAutocomplete } from '../fixtures/workspaces'
import { paths } from '../paths'
import { importLists, importListView, isImportList } from './importedListViews'
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
     * that the operator suspended, Acme after its list did not load, Acme
     * with its Archived group open, or Acme after an import from Conductor,
     * which adds the section Import from Conductor. After the import, the
     * list can also show the question of Archive over it, the list just
     * after that Archive, or the activated workspace in the Archived group.
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
        'archived',
        ...importLists,
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

/**
 * The sections of a list before any state changes them. The lists after
 * an import have their own view, with the section Import from Conductor.
 */
function sectionsOf(list: WorkspaceListState['list']): SidebarSection[] {
  if (list === 'general-only') return generalOnlySections()
  if (list === 'suspended') return suspendedSections()
  if (list === 'archived') return archivedGroup().sections
  return newOrgs[list] ? newOrgSections() : workspaceSections()
}

/**
 * The open Archived group of the `archived` list, with the pointer over
 * the row of the last archived workspace, whose Restore covers its time.
 * A phone draws no hover, because it has no pointer.
 */
function archivedGroupView(): Pick<MenuListView, 'archived' | 'focus'> {
  return {
    archived: archivedGroup().archived,
    focus: { workspace: checkoutAutocomplete.key, drawing: { kind: 'hover' } },
  }
}

/**
 * The list and what lies over it, in a state of the menu of a row, or in a
 * list after an import.
 */
function rowMenuView(
  state: WorkspaceListState,
  viewport: Viewport,
): MenuListView | undefined {
  const { list, menu } = state
  if (isImportList(list)) return importListView(list, viewport)
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
  const group = list === 'archived' ? archivedGroupView() : undefined
  // No entry draws the org switcher over the list after an import.
  return (
    <MobileFrame>
      <HomeList
        archived={view?.archived ?? group?.archived}
        archivedCollapsed={view?.archivedCollapsed}
        drag={listDrag(menu)}
        failed={list === 'failed'}
        focus={view?.focus ?? group?.focus}
        menu={listMenu(menu)}
        menuStyle="sheet"
        newWorkspaceTo={fresh?.newWorkspaceTo}
        org={fresh ? fresh.org : orgs.acme}
        sections={sections}
        switcherTo={isImportList(list) ? null : undefined}
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
  const group = list === 'archived' ? archivedGroupView() : undefined
  const listed = {
    archived: view?.archived ?? group?.archived,
    archivedCollapsed: view?.archivedCollapsed,
    drag: listDrag(menu),
    failed: list === 'failed',
    menu: listMenu(menu),
    focus: view?.focus ?? group?.focus,
    org: orgs.acme,
    sections: view?.sections ?? sectionsOf(list),
    viewer: view?.viewer ?? viewer,
  }
  const rail = view?.rail ?? listRail(menu)
  // After an import, the tile of Acme keeps the list with the import. No
  // entry draws the org switcher of a narrow window over that list.
  const imported = isImportList(list)
  return (
    <AppFrame
      overlay={listPalette(palette, props.viewport) ?? view?.over}
      rail={imported ? { ...rail, currentTo: paths.importedList } : rail}
      sidebar={<Sidebar {...listed} />}
    >
      <div className={`${responsive.wideOnly} ${styles.choose}`}>
        <ChooseWorkspace />
      </div>
      <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
        <HomeList
          {...listed}
          keys
          menuStyle="anchored"
          switcherTo={imported ? null : undefined}
        />
      </div>
    </AppFrame>
  )
}
