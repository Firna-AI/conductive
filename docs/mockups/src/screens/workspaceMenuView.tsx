import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FailureToast } from '../components/common/FailureToast'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import { ArchivedToast } from '../components/workspace/ArchivedToast'
import {
  rowControls,
  type RowFocus,
} from '../components/workspaces/rowControls'
import {
  suspendedSections,
  workspaceSections,
  type SidebarSection,
  type WorkspaceRow,
} from '../components/workspaces/sections'
import {
  archivedWorkspaceList,
  keptArchives,
} from '../fixtures/archivedWorkspaces'
import {
  memberViewer,
  people,
  viewerMembership,
  type Membership,
} from '../fixtures/members'
import { suspendedOrg } from '../fixtures/orgs'
import { defaultSection, sections } from '../fixtures/sections'
import { workspaceList } from '../fixtures/workspaces'
import { menuTarget, offline } from '../fixtures/workspaceMenu'
import { WorkspaceMenuSheet } from './listSheets'
import {
  scenarios,
  type Scenario,
  type WorkspaceMenuState,
} from './workspaceMenuStates'

/** The lists where a row opens its menu: an org in use, or suspended. */
export type MenuList = 'workspaces' | 'general-only' | 'suspended'

/** The list of a workspace menu state, and what lies over it. */
export type MenuListView = {
  sections: readonly SidebarSection[]
  archived?: readonly WorkspaceRow[]
  archivedCollapsed?: boolean
  /** The person who looks at the list. */
  viewer: Membership
  /** The row whose menu, field, or hover the view draws. */
  focus?: RowFocus
  rail: RailState
  /** A phone sheet, or a toast. */
  over: ReactNode
}

/**
 * The archived workspaces of Acme. Those of the last 14 days offer Restore
 * on their rows.
 */
const archivedRows: readonly WorkspaceRow[] = archivedWorkspaceList.map(
  (workspace) => ({
    workspace,
    status: 'archived',
    selected: false,
    restoreOpen: keptArchives.has(workspace.key),
  }),
)

/**
 * An org whose only section is General: Acme after an admin deleted
 * Checkout and Infra, which moved their workspaces to General.
 */
export function generalOnlySections(): SidebarSection[] {
  const rows = workspaceSections()
    .flatMap((item) => item.rows)
    .map((row) => ({
      ...row,
      workspace: { ...row.workspace, section: defaultSection },
    }))
  return [{ section: sections[defaultSection], rows }]
}

/** The row of the workspace that Archive or Restore changed, just now. */
function changedNow(
  row: WorkspaceRow,
  status: 'archived' | 'stopped',
): WorkspaceRow {
  return { ...row, status, workspace: { ...row.workspace, updated: 'now' } }
}

/** The list of a state, and the Archived group under it. */
function rowsOf(
  list: MenuList,
  scenario: Scenario,
): Pick<MenuListView, 'sections' | 'archived' | 'archivedCollapsed'> {
  if (list === 'suspended') return { sections: suspendedSections() }
  if (list === 'general-only') return { sections: generalOnlySections() }
  if (scenario.archived === 'open') {
    return { sections: workspaceSections(), archived: archivedRows }
  }
  const target = scenario.target ?? menuTarget
  const isTarget = (row: WorkspaceRow) => row.workspace.key === target
  const all = workspaceSections()
  if (scenario.archived === 'restored') {
    // Restore put the workspace back in its section, at its place, with its
    // cloud computer stopped, as Archive left it.
    return {
      sections: all.map((item) => ({
        ...item,
        rows: item.rows.map((row) =>
          isTarget(row) ? changedNow(row, 'stopped') : row,
        ),
      })),
    }
  }
  if (scenario.archived !== 'after-archive') return { sections: all }
  // The archive took the workspace from its section to the Archived group,
  // which stays collapsed, because the workspace is not open.
  const gone = all.flatMap((item) => item.rows).filter(isTarget)
  return {
    sections: all.map((item) => ({
      ...item,
      rows: item.rows.filter((row) => !isTarget(row)),
    })),
    archived: gone.map((row): WorkspaceRow => ({
      ...changedNow(row, 'archived'),
      restoreOpen: true,
    })),
    archivedCollapsed: true,
  }
}

/**
 * The phone sheet of the menu that a context event opened on the drawn
 * row, if any.
 */
function sheetOf(view: Omit<MenuListView, 'over'>): ReactNode {
  const { focus } = view
  const row = [
    ...view.sections.flatMap((item) => item.rows),
    ...(view.archived ?? []),
  ].find((item) => item.workspace.key === focus?.workspace)
  if (!row || focus?.drawing.kind !== 'menu') return null
  const open = rowControls(row, focus, {
    viewer: view.viewer,
    sections: view.sections.map((item) => item.section.key),
    readOnly: false,
    sheet: true,
  })?.open
  return open ? <WorkspaceMenuSheet menu={open} /> : null
}

function overOf(
  scenario: Scenario,
  view: Omit<MenuListView, 'over'>,
  viewport: Viewport,
): ReactNode {
  const target = workspaceList.find(
    (item) => item.key === (scenario.target ?? menuTarget),
  )
  switch (scenario.over) {
    case undefined:
      return viewport === 'mobile' ? sheetOf(view) : null
    case 'rename-failed':
      return (
        <FailureToast
          message={offline}
          phone={viewport === 'mobile'}
          title="The workspace wasn't renamed."
        />
      )
    case 'archived':
      // Archive took the workspace to the Archived group at once, and its
      // toast offers Restore.
      return target ? (
        <ArchivedToast
          name={target.name}
          phone={viewport === 'mobile'}
          restorable
        />
      ) : null
  }
}

/** The list that a workspace menu state draws, and what lies over it. */
export function menuListView(
  state: WorkspaceMenuState,
  list: MenuList,
  viewport: Viewport,
): MenuListView {
  const scenario = scenarios[state]
  const member = scenario.member ?? false
  let rail: RailState = acmeRail
  if (member) rail = { ...acmeRail, person: people[memberViewer] }
  if (list === 'suspended') rail = { ...acmeRail, suspended: suspendedOrg }
  const view = {
    ...rowsOf(list, scenario),
    viewer: viewerMembership(member ? 'member' : 'admin'),
    focus: scenario.focus,
    rail,
  }
  return { ...view, over: overOf(scenario, view, viewport) }
}
