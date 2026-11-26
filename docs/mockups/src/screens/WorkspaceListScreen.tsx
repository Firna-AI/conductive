import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { appFrame } from '../entries/components/layout/AppFrame.mockup'
import { paletteViews } from '../components/palette/paletteViews'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import { defined, plainData } from '../defined'
import responsive from '../../../../src/ui/components/layout/responsive.module.css'
import {
  newOrgSections,
  suspendedSections,
} from '../components/workspaces/sections'
import { sidebar } from '../entries/components/workspaces/Sidebar.mockup'
import { deletedOrg, orgList, orgs, suspendedOrg } from '../fixtures/orgs'
import {
  chooseWorkspace,
  deletedOrgPart,
  homeList,
  newOrgEmpty,
  newOrgOf,
  suspendedList,
} from '../entries/components/screens/listParts.mockup'
import {
  listDrag,
  listMenu,
  listPalette,
  listRail,
  newOrgs,
} from './listStates'
import { orderRail, orgOrderStates } from './orgOrderStates'
import { mergeQueueStates } from './queueStates'
import { subWorkspaceStates } from './subWorkspaceStates'
import { workspaceMenuStates } from './workspaceMenuStates'
import { MobileList } from './workspaceListMobile'
import {
  archivedGroupView,
  listViewer,
  sectionsOf,
  stateView,
} from './listViews'
import styles from '../../../../src/ui/screens/WorkspaceListScreen.module.css'

export const workspaceListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'menu', 'palette'],
  properties: {
    /**
     * The workspaces of Acme, Acme with only the General section, the
     * first org of a new user or another new org, both without workspaces,
     * a deleted org, Acme after the operator suspended it, a deleted org
     * that the operator suspended, Acme after its list did not load, or
     * Acme with its Archived group open.
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
      ],
    },
    /**
     * The menu of a section, a workspace dragged, a section dragged, the
     * org switcher, or the org switcher of an operator, which adds
     * Operator. Or a state of the menu of a workspace row, which the lists
     * of Acme draw.
     */
    menu: {
      enum: [
        'none',
        'section',
        'drag',
        'drag-section',
        'orgs',
        'operator',
        ...workspaceMenuStates,
      ],
    },
    /** The command palette, closed or open on one of its views. */
    palette: { enum: paletteViews },
    /**
     * The reorder of the orgs in the rail, and in the org switcher of a
     * phone, as `orgOrderStates` says. Without it, the orgs keep their
     * saved order.
     */
    orgOrder: { enum: orgOrderStates },
    /**
     * The sub-workspaces of Acme, nested under their parents, as
     * `subWorkspaceStates` says. Without it, every row is top-level.
     */
    subWorkspaces: { enum: subWorkspaceStates },
    /**
     * The merge queues of Acme in the Merge queue group, as
     * `mergeQueueStates` says. Without it, the list has no group.
     */
    mergeQueue: { enum: mergeQueueStates },
  },
} as const

export type WorkspaceListState = SchemaProps<typeof workspaceListSchema>

/**
 * The workspace list of an org, grouped in the sections that the user made.
 * On a phone and in a narrow window it is the home screen. On a wide
 * desktop the list is the sidebar, and the main area waits for a choice.
 * A right click on a row, or the menu keys, opens the menu of the row.
 * `overlay` lies over the list of Acme in place of the overlay of its
 * state, such as a dialog that the palette opens over it.
 */
export function WorkspaceListScreen(props: {
  state: WorkspaceListState
  viewport: Viewport
  overlay?: ReactNode
}) {
  const { list, menu, palette, orgOrder } = props.state
  if (props.viewport === 'mobile') {
    return <MobileList overlay={props.overlay} state={props.state} />
  }
  const view = stateView(props.state, props.viewport)
  if (list === 'suspended') {
    const suspendedView = plainData({
      focus: view?.focus,
      sections: view?.sections ?? suspendedSections(),
      viewer: view?.viewer ?? listViewer,
    })
    return (
      <appFrame.Component
        rail={{ ...(orderRail(orgOrder) ?? acmeRail), suspended: suspendedOrg }}
        sidebar={
          <sidebar.Component
            moklyInstance="sidebar"
            org={orgs[suspendedOrg]}
            suspended
            {...suspendedView}
          />
        }
      >
        <suspendedList.Component
          moklyInstance="suspended-list"
          {...suspendedView}
        />
      </appFrame.Component>
    )
  }
  if (list === 'deleted' || list === 'deleted-suspended') {
    // The rail leaves out a deleted org, so no tile is current.
    const rail: RailState = {
      orgs: orgList.filter((org) => org.key !== deletedOrg.org),
    }
    return (
      <appFrame.Component rail={rail}>
        <deletedOrgPart.Component
          moklyInstance="deleted-org"
          suspended={list === 'deleted-suspended'}
        />
      </appFrame.Component>
    )
  }
  const fresh = newOrgs[list]
  if (fresh) {
    const rail: RailState = { orgs: fresh.rail, current: fresh.org.key }
    return (
      <appFrame.Component
        rail={rail}
        sidebar={
          <sidebar.Component
            moklyInstance="sidebar"
            newWorkspaceTo={fresh.newWorkspaceTo}
            org={fresh.org}
            sections={newOrgSections()}
            viewer={listViewer}
          />
        }
      >
        <newOrgEmpty.Component
          moklyInstance="new-org-empty"
          newWorkspaceTo={fresh.newWorkspaceTo}
          org={newOrgOf(fresh.form)}
        />
      </appFrame.Component>
    )
  }
  const group = list === 'archived' ? archivedGroupView() : undefined
  const listed = plainData({
    archived: view?.archived ?? group?.archived,
    archivedCollapsed: view?.archivedCollapsed,
    drag: view?.drag ?? listDrag(menu),
    failed: list === 'failed',
    menu: listMenu(menu),
    focus: view?.focus ?? group?.focus,
    org: orgs.acme,
    queue: view?.queue,
    queueDrag: view?.queueDrag,
    queueable: view?.queueable,
    sections: view?.sections ?? sectionsOf(list),
    viewer: view?.viewer ?? listViewer,
  })
  return (
    <appFrame.Component
      rail={view?.rail ?? listRail(menu, orgOrder)}
      {...defined({
        overlay:
          props.overlay ??
          listPalette(palette, props.viewport) ??
          view?.over ??
          undefined,
      })}
      sidebar={<sidebar.Component moklyInstance="sidebar" {...listed} />}
    >
      <div className={`${responsive.wideOnly} ${styles.choose}`}>
        <chooseWorkspace.Component moklyInstance="choose-workspace" />
      </div>
      <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
        <homeList.Component
          keys
          menuStyle="anchored"
          moklyInstance="home-list"
          {...listed}
        />
      </div>
    </appFrame.Component>
  )
}
