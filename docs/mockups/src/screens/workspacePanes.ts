import type { Viewport } from '@mokly/mokly'
import type { ContentDrop } from '../components/workspace/PaneDrop'
import {
  moveStatus,
  type PaneSide,
  type TabMove,
} from '../components/workspace/paneCopy'
import type { OneRow } from '../components/workspace/SplitColumn'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import type { TabDrag } from '../components/workspace/WorkspaceTabs'
import { workspaceSessions } from '../fixtures/sessions'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey } from './workspaceTabRow'

const [first, second] = workspaceSessions

/** A state of the centre column with split panes, or with a drag to one. */
export type SplitState = Exclude<WorkspaceState['panes'], 'one'>

/** The keys of the tabs of each pane, the shown tab of each, and the focus. */
type Layout = {
  panes: readonly (readonly string[])[]
  shown: readonly string[]
  focused: number
}

/** The code file and its chat beside the session that the user dropped. */
const sessionsSplit: Layout = {
  panes: [[first.key, codeTabKey], [second.key]],
  shown: [first.key, second.key],
  focused: 1,
}

/** The two sessions beside the kept code file. The user typed in the chat. */
const fileSplit: Layout = {
  panes: [[first.key, second.key], [codeTabKey]],
  shown: [first.key, codeTabKey],
  focused: 0,
}

/** One pane, before the drop that opens the second pane. */
const onePane: Layout = {
  panes: [[first.key, second.key, codeTabKey]],
  shown: [first.key],
  focused: 0,
}

const layouts: Readonly<Record<SplitState, Layout>> = {
  sessions: sessionsSplit,
  file: fileSplit,
  'drag-left': onePane,
  'drag-right': onePane,
  'drag-pane': sessionsSplit,
  'drag-row': sessionsSplit,
}

/**
 * Where the dragged tab of a state hovers on desktop: over a half of the
 * one pane, over the content of the other pane, or over the other row,
 * before the tab at `index`.
 */
type Hover =
  | { over: 'half'; side: PaneSide }
  | { over: 'pane' }
  | { over: 'row'; index: number }

const desktopDrags: Readonly<
  Partial<Record<SplitState, { tab: string; hover: Hover }>>
> = {
  'drag-left': { tab: codeTabKey, hover: { over: 'half', side: 'left' } },
  'drag-right': { tab: second.key, hover: { over: 'half', side: 'right' } },
  'drag-pane': { tab: codeTabKey, hover: { over: 'pane' } },
  'drag-row': { tab: codeTabKey, hover: { over: 'row', index: 0 } },
}

/** One pane of the plan: its side, its tabs, its drag, and its drop mark. */
type PanePlan = {
  side: PaneSide
  tabs: WorkspaceTab[]
  /** The key of its shown tab. A phone leaves out a pane of files only. */
  shown?: string
  drag?: TabDrag
  drop?: ContentDrop
}

/** The panes of a state, the focused pane, and the one row of both panes. */
export type SplitPlan = { panes: PanePlan[]; focused: number; row: OneRow }

/**
 * The tabs of a pane, from the tabs that the viewport shows. A split draws
 * each tab where it is, so a tab links to no screen of one pane.
 */
function paneOf(
  tabs: readonly WorkspaceTab[],
  keys: readonly string[],
  side: PaneSide,
  shown: string,
): PanePlan {
  const own = tabs.flatMap((tab) =>
    keys.includes(tab.key)
      ? [{ ...tab, to: undefined, selected: tab.key === shown }]
      : [],
  )
  const has = own.some((tab) => tab.key === shown)
  return { side, tabs: own, shown: has ? shown : undefined }
}

/** Adds the desktop drag of the state to the panes, and gives its row drag. */
function withDesktopDrag(
  panes: PanePlan[],
  state: SplitState,
): TabDrag | undefined {
  const drag = desktopDrags[state]
  const source = panes.find((pane) =>
    pane.tabs.some((tab) => tab.key === drag?.tab),
  )
  const tab = source?.tabs.find((each) => each.key === drag?.tab)
  if (!drag || !source || !tab) return undefined
  source.drag = { tab: tab.key }
  const { hover } = drag
  if (hover.over === 'half') {
    const move: TabMove = { kind: 'new-pane', pane: hover.side }
    const status = moveStatus(tab.title, move)
    source.drop = { area: hover.side, tab, status }
    return { tab: tab.key }
  }
  const target = panes.find((pane) => pane !== source)
  if (!target) return undefined
  const count = target.tabs.length + 1
  const index = hover.over === 'row' ? hover.index : target.tabs.length
  const move: TabMove = {
    kind: 'pane',
    pane: target.side,
    place: index + 1,
    count,
  }
  if (hover.over === 'pane') {
    target.drop = { area: 'pane', tab, status: moveStatus(tab.title, move) }
    return { tab: tab.key }
  }
  target.drag = { tab: tab.key, index, from: tab, move }
  // The one row of a narrow column holds the right part after the left.
  const start = target.side === 'right' ? panes[0].tabs.length : 0
  return { tab: tab.key, index: start + index, move }
}

/**
 * The long press of a phone, which has no drop on the content: the second
 * session at its place over one pane, or across the border into the end of
 * the left part over a split. The left part then takes it as its last tab.
 */
function phoneDrag(row: OneRow, split: boolean): TabDrag | undefined {
  const at = row.tabs.findIndex((tab) => tab.key === second.key)
  if (at < 0) return undefined
  const border = row.border
  if (!split || border === undefined || at < border) {
    return { tab: second.key, index: at }
  }
  const move: TabMove = {
    kind: 'pane',
    pane: 'left',
    place: border + 1,
    count: border + 1,
  }
  return { tab: second.key, index: border, move }
}

/**
 * The panes of a split state, for the tabs that the viewport shows. In the
 * one row, only the shown tab of the focused pane is selected. A read-only
 * workspace binds no drag.
 */
export function splitPlanOf(
  state: SplitState,
  tabs: readonly WorkspaceTab[],
  viewport: Viewport,
  readOnly: boolean,
): SplitPlan {
  const layout = layouts[state]
  const panes = layout.panes.map((keys, index) =>
    paneOf(tabs, keys, index === 0 ? 'left' : 'right', layout.shown[index]),
  )
  const focused = layout.focused
  const rowTabs = panes.flatMap((pane, index) =>
    pane.tabs.map((tab) => ({
      ...tab,
      selected: tab.selected && index === focused,
    })),
  )
  const split = panes.length > 1
  const row: OneRow = {
    tabs: rowTabs,
    border: split ? panes[0].tabs.length : undefined,
  }
  if (readOnly || desktopDrags[state] === undefined) {
    return { panes, focused, row }
  }
  const drag =
    viewport === 'mobile'
      ? phoneDrag(row, split)
      : withDesktopDrag(panes, state)
  return { panes, focused, row: { ...row, drag } }
}
