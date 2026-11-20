import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { defined } from '../defined'
import { commandPalette } from '../entries/components/palette/CommandPalette.mockup'
import type { PaletteView } from '../components/palette/paletteViews'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import type { ListDrag, ListMenu } from '../components/workspaces/sections'
import { orgList, orgListWithLabs, orgs, type Org } from '../fixtures/orgs'
import { anotherOrg, newOrg } from '../fixtures/repositories'
import { menuSection, sectionDrag } from '../fixtures/sections'
import { workspaceDrag } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { NewOrg } from './listParts'
import {
  orgSwitcherSheet,
  sectionSheet,
} from '../entries/components/screens/listSheets.mockup'
import { orderRail, orgOrderView, type OrgOrderState } from './orgOrderStates'
import type { WorkspaceListState } from './WorkspaceListScreen'

type Open = WorkspaceListState['menu']

export function listMenu(menu: Open): ListMenu | undefined {
  return menu === 'section' ? { section: menuSection } : undefined
}

export function listDrag(menu: Open): ListDrag | undefined {
  if (menu === 'drag') return workspaceDrag
  return menu === 'drag-section' ? sectionDrag : undefined
}

/**
 * The command palette over the list of Acme, or nothing while it is
 * closed. The list has no open workspace, so the palette offers no actions
 * of a workspace.
 */
export function listPalette(view: PaletteView, viewport: Viewport): ReactNode {
  if (view === 'closed') return null
  return (
    <commandPalette.Component
      context={{ archivable: false, sidebar: viewport !== 'mobile' }}
      moklyInstance="command-palette"
      view={view}
      viewport={viewport}
    />
  )
}

/**
 * The sheet of a phone over the list: the menu of a section, or the org
 * switcher, which an operator's adds Operator to. The org switcher shows
 * the state of the reorder, `order`, when there is one.
 */
export function listSheet(menu: Open, order?: OrgOrderState): ReactNode {
  const ordered = orgOrderView(order, 'mobile')
  const orgs = ordered?.orgs
  const drag = ordered?.drag
  switch (menu) {
    case 'section':
      return <sectionSheet.Component moklyInstance="section-sheet" />
    case 'orgs':
    case 'operator':
      return (
        <orgSwitcherSheet.Component
          current="acme"
          moklyInstance="org-switcher-sheet"
          operator={menu === 'operator'}
          {...defined({ drag, orgs })}
        />
      )
    default:
      return null
  }
}

/**
 * The rail of the list: the state of the reorder, `order`, when there is
 * one, with Operator for an operator. Otherwise the name of Futex beside
 * the open org switcher, and Operator with its name for an operator.
 */
export function listRail(menu: Open, order?: OrgOrderState): RailState {
  const ordered = orderRail(order)
  if (ordered) return { ...ordered, operator: menu === 'operator' }
  if (menu === 'orgs') return { ...acmeRail, hint: 'futex' }
  if (menu === 'operator') {
    return { ...acmeRail, operator: true, hint: 'operator' }
  }
  return acmeRail
}

/**
 * A new org before its first workspace, and its New workspace page. The
 * mockups draw the first build of Firna on its own New workspace page.
 */
export type FreshOrg = {
  org: Org
  rail: readonly Org[]
  form: NewOrg
  newWorkspaceTo: string
}

/**
 * The new orgs before their first workspace: the first org of the sign-up,
 * and another org that Create org made beside the user's orgs.
 */
export const newOrgs: Readonly<
  Partial<Record<WorkspaceListState['list'], FreshOrg>>
> = {
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
