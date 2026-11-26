import type { ReactNode } from 'react'
import { plainData } from '../defined'
import { mobileFrame } from '../entries/components/layout/AppFrame.mockup'
import {
  deletedOrgPart,
  homeList,
  listHeader,
} from '../entries/components/screens/listParts.mockup'
import { deletedOrg, orgs, suspendedOrg } from '../fixtures/orgs'
import {
  listDrag,
  listMenu,
  listPalette,
  listSheet,
  newOrgs,
} from './listStates'
import {
  archivedGroupView,
  listViewer,
  sectionsOf,
  stateView,
} from './listViews'
import type { WorkspaceListState } from './WorkspaceListScreen'

/**
 * The workspace list of an org on a phone, where it is the home screen.
 * The palette is a page in place of the list. A deleted org shows its page
 * under the header, and a suspended org opens only the org switcher.
 * `overlay` lies over the list in place of the sheet of its state.
 */
export function MobileList(props: {
  state: WorkspaceListState
  overlay?: ReactNode
}) {
  const { list, menu, palette } = props.state
  // On a phone the palette is a page in place of the list.
  if (palette !== 'closed') {
    return (
      <mobileFrame.Component>
        {listPalette(palette, 'mobile')}
      </mobileFrame.Component>
    )
  }
  if (list === 'deleted' || list === 'deleted-suspended') {
    return (
      <mobileFrame.Component>
        <listHeader.Component
          moklyInstance="list-header"
          org={orgs[deletedOrg.org]}
          settings={false}
        />
        <deletedOrgPart.Component
          moklyInstance="deleted-org"
          suspended={list === 'deleted-suspended'}
        />
      </mobileFrame.Component>
    )
  }
  const view = stateView(props.state, 'mobile')
  const sections = view?.sections ?? sectionsOf(list)
  if (list === 'suspended') {
    // A suspended org has no section menus, so only the org switcher opens.
    return (
      <mobileFrame.Component>
        <homeList.Component
          menuStyle="sheet"
          moklyInstance="home-list"
          org={orgs[suspendedOrg]}
          sections={plainData(sections)}
          suspended
          viewer={view?.viewer ?? listViewer}
          {...plainData({ focus: view?.focus })}
        />
        {menu === 'orgs' ? listSheet(menu, props.state.orgOrder) : null}
      </mobileFrame.Component>
    )
  }
  const fresh = newOrgs[list]
  const group = list === 'archived' ? archivedGroupView() : undefined
  return (
    <mobileFrame.Component>
      <homeList.Component
        menuStyle="sheet"
        moklyInstance="home-list"
        {...plainData({
          archived: view?.archived ?? group?.archived,
          archivedCollapsed: view?.archivedCollapsed,
          drag: view?.drag ?? listDrag(menu),
          failed: list === 'failed',
          focus: view?.focus ?? group?.focus,
          menu: listMenu(menu),
          newWorkspaceTo: fresh?.newWorkspaceTo,
          org: fresh ? fresh.org : orgs.acme,
          queue: view?.queue,
          queueDrag: view?.queueDrag,
          queueable: view?.queueable,
          sections,
          viewer: view?.viewer ?? listViewer,
        })}
      />
      {props.overlay ??
        (view ? view.over : listSheet(menu, props.state.orgOrder))}
    </mobileFrame.Component>
  )
}
