import type { Viewport } from '@mokly/mokly'
import { acmeRail } from '../components/layout/OrgRail'
import type { RowFocus } from '../components/workspaces/rowControls'
import {
  archivedRows,
  workspaceSections,
  type ListDrag,
  type SidebarSection,
  type WorkspaceRow,
} from '../components/workspaces/sections'
import { withTrees } from '../components/workspaces/trees'
import { memberViewer, people, viewerMembership } from '../fixtures/members'
import type { SectionKey } from '../fixtures/sections'
import {
  parentOf,
  placesClient,
  subWorkspaceList,
} from '../fixtures/subWorkspaces'
import type { Workspace } from '../fixtures/workspaces'
import { sheetOf, type MenuListView } from './workspaceMenuView'

/**
 * The states of the list of Acme with its sub-workspaces, as values of the
 * `subWorkspaces` prop of the list: no trees, the two trees of Checkout,
 * the trees after the Archive of a middle row, the drag of a tree to
 * General, the list after that move, the drag of a tree between two trees,
 * and the menu of a nested row, of a nested row for a member, and of a
 * top-level row with its sections.
 */
export const subWorkspaceStates = [
  'none',
  'trees',
  'archived-parent',
  'drag',
  'moved',
  'between-trees',
  'menu',
  'menu-member',
  'menu-top-level',
] as const

export type SubWorkspaceState = (typeof subWorkspaceStates)[number]

/** The list of a state, the drag that lifts a tree, and the open menu. */
type Scenario = {
  list: 'trees' | 'archived-parent' | 'moved'
  drag?: ListDrag
  focus?: RowFocus
  /** Priya, a member who is not an admin, looks at the list. */
  member?: boolean
}

/** The tree of Apple Pay button, dragged to General before Invoice PDF fonts. */
const toGeneral = {
  kind: 'workspace',
  workspace: 'apple-pay',
  section: 'general',
  index: 1,
} as const

const scenarios: Readonly<
  Record<Exclude<SubWorkspaceState, 'none'>, Scenario>
> = {
  trees: { list: 'trees' },
  'archived-parent': { list: 'archived-parent' },
  drag: { list: 'trees', drag: toGeneral },
  moved: { list: 'moved' },
  // The tree of Checkout address autocomplete, dragged above the tree of
  // Apple Pay button.
  'between-trees': {
    list: 'trees',
    drag: {
      kind: 'workspace',
      workspace: 'checkout-autocomplete',
      section: 'checkout',
      index: 2,
    },
  },
  menu: {
    list: 'trees',
    focus: { workspace: placesClient.key, drawing: { kind: 'menu' } },
  },
  'menu-member': {
    list: 'trees',
    focus: { workspace: placesClient.key, drawing: { kind: 'menu' } },
    member: true,
  },
  'menu-top-level': {
    list: 'trees',
    focus: {
      workspace: 'checkout-autocomplete',
      drawing: { kind: 'menu', submenu: 'move' },
    },
  },
}

function rowOf(workspace: Workspace): WorkspaceRow {
  return {
    workspace,
    status: workspace.status,
    github: workspace.github,
    selected: false,
  }
}

/**
 * The rows of Acme when the app opens, then each sub-workspace in the
 * section of its record, before the trees place them.
 */
export function flatSections(): SidebarSection[] {
  const added = subWorkspaceList.map(rowOf)
  return workspaceSections().map((item) => ({
    ...item,
    rows: [
      ...item.rows,
      ...added.filter((row) => row.workspace.section === item.section.key),
    ],
  }))
}

/**
 * The sections after the drop of a top-level row at the place `index` of
 * another section, which counts only the top-level rows. Its
 * sub-workspaces follow it, because they show under their parent wherever
 * the list shows it.
 */
function afterMove(
  sections: readonly SidebarSection[],
  move: { workspace: string; section: SectionKey; index: number },
): SidebarSection[] {
  const row = sections
    .flatMap((item) => item.rows)
    .find((item) => item.workspace.key === move.workspace)
  if (!row) return [...sections]
  const moved = {
    ...row,
    workspace: { ...row.workspace, section: move.section },
  }
  return sections.map((item) => {
    const rows = item.rows.filter((other) => other !== row)
    if (item.section.key !== move.section) return { ...item, rows }
    const before = rows
      .filter((other) => !parentOf.has(other.workspace.key))
      .at(move.index)
    const at = before ? rows.indexOf(before) : rows.length
    return { ...item, rows: rows.toSpliced(at, 0, moved) }
  })
}

/** The list of a state, and its Archived group when it shows one. */
function listOf(
  list: Scenario['list'],
): Pick<MenuListView, 'sections' | 'archived'> {
  const flat = flatSections()
  if (list === 'trees') return { sections: withTrees(flat, parentOf) }
  if (list === 'moved') {
    return { sections: withTrees(afterMove(flat, toGeneral), parentOf) }
  }
  // Cal archived Places API client a minute ago, after its merge. It left
  // its tree for the Archived group, the last archived first. Its record
  // keeps its place for a Restore. So the trees get the archived row at
  // that place, and its sub-workspaces take that place in the list.
  const archived: WorkspaceRow = {
    ...rowOf({ ...placesClient, updated: '1m' }),
    status: 'archived',
    restoreOpen: true,
  }
  const sections = flat.map((item) => ({
    ...item,
    rows: item.rows.map((row) =>
      row.workspace.key === placesClient.key ? archived : row,
    ),
  }))
  return {
    sections: withTrees(sections, parentOf),
    archived: [archived, ...archivedRows()],
  }
}

/** The list with its trees, what a drag lifts, and what lies over it. */
export type TreeListView = MenuListView & { drag?: ListDrag }

/**
 * The list that a state draws: its sections with their trees, the open
 * Archived group, the drag, the row whose menu is open, and on a phone the
 * sheet of that menu. Nothing without a state of sub-workspaces.
 */
export function subWorkspaceView(
  state: SubWorkspaceState | undefined,
  viewport: Viewport,
): TreeListView | undefined {
  if (state === undefined || state === 'none') return undefined
  const scenario = scenarios[state]
  const member = scenario.member === true
  const view = {
    ...listOf(scenario.list),
    viewer: viewerMembership(member ? 'member' : 'admin'),
    focus: scenario.focus,
    rail: member ? { ...acmeRail, person: people[memberViewer] } : acmeRail,
  }
  return {
    ...view,
    drag: scenario.drag,
    over: viewport === 'mobile' ? sheetOf(view) : null,
  }
}
