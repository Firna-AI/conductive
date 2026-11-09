import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FailureToast } from '../components/common/FailureToast'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import {
  ArchiveDialog,
  type ArchiveLinks,
} from '../components/workspace/ArchiveDialog'
import {
  rowControls,
  type ListRows,
} from '../components/workspaces/rowControls'
import {
  suspendedSections,
  workspaceSections,
  type SidebarSection,
  type WorkspaceRow,
} from '../components/workspaces/sections'
import { archivedWorkspaceList } from '../fixtures/archivedWorkspaces'
import { memberViewer, people, you } from '../fixtures/members'
import { suspendedOrg } from '../fixtures/orgs'
import { defaultSection, sections } from '../fixtures/sections'
import { workspaceList } from '../fixtures/workspaces'
import {
  checkRefused,
  menuTarget,
  menuTargetWork,
  offline,
  stoppedTarget,
} from '../fixtures/workspaceMenu'
import { paths } from '../paths'
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
  rows: ListRows
  rail: RailState
  /** A phone sheet, a question of Archive, or a toast. */
  over: ReactNode
}

const archivedRows: readonly WorkspaceRow[] = archivedWorkspaceList.map(
  (workspace) => ({ workspace, status: 'archived', selected: false }),
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

function isTarget(row: WorkspaceRow): boolean {
  return row.workspace.key === menuTarget
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
  if (scenario.archived !== 'after-archive') {
    return { sections: workspaceSections() }
  }
  // The archive took the workspace from its section to the Archived group,
  // which stays collapsed, because the workspace is not open.
  const all = workspaceSections()
  const gone = all.flatMap((item) => item.rows).filter(isTarget)
  return {
    sections: all.map((item) => ({
      ...item,
      rows: item.rows.filter((row) => !isTarget(row)),
    })),
    archived: gone.map((row): WorkspaceRow => ({ ...row, status: 'archived' })),
    archivedCollapsed: true,
  }
}

/** Archive from a row of the list: Cancel returns to the list. */
const listArchiveLinks: ArchiveLinks = {
  cancel: paths.shell,
  archived: paths.workspaceMenuArchived,
}

/** The phone sheet of the open menu of the drawn row, if any. */
function sheetOf(view: Omit<MenuListView, 'over'>): ReactNode {
  const focus = view.rows.focus
  const row = [
    ...view.sections.flatMap((item) => item.rows),
    ...(view.archived ?? []),
  ].find((item) => item.workspace.key === focus?.workspace)
  if (!row || focus?.drawing.kind !== 'menu') return null
  const { open } = rowControls(row, view.rows, {
    sections: view.sections.map((item) => item.section.key),
    readOnly: false,
    touch: true,
  })
  return open ? <WorkspaceMenuSheet menu={open} /> : null
}

function overOf(
  scenario: Scenario,
  view: Omit<MenuListView, 'over'>,
  viewport: Viewport,
): ReactNode {
  const named = (key: string) => workspaceList.find((item) => item.key === key)
  const target = named(menuTarget)
  const stopped = named(stoppedTarget)
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
    case 'archive':
      return target ? (
        <ArchiveDialog
          links={listArchiveLinks}
          question={{ kind: 'unpushed', work: menuTargetWork }}
          viewport={viewport}
          workspace={target}
        />
      ) : null
    case 'check-failed':
      return stopped ? (
        <ArchiveDialog
          links={listArchiveLinks}
          question={{ kind: 'check-failed', message: checkRefused }}
          viewport={viewport}
          workspace={stopped}
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
    rows: {
      viewer: member ? memberViewer : you,
      admin: !member,
      focus: scenario.focus,
    },
    rail,
  }
  return { ...view, over: overOf(scenario, view, viewport) }
}
