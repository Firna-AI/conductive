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

const second = workspaceSessions[1]

/** A state of the panes of the centre column. */
type PaneState = WorkspaceState['panes']

/**
 * One pane of the plan of a split: its side, its tabs, the key of its shown
 * tab, its drag, its drop mark, and the tab of its row whose menu is open.
 * On a phone, a pane that shows a file has no shown tab in the row.
 */
export type PanePlan = {
  side: PaneSide
  tabs: WorkspaceTab[]
  shown?: string
  drag?: TabDrag
  drop?: ContentDrop
  menuTab?: string
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
  Partial<Record<PaneState, { tab: string; hover: Hover }>>
> = {
  'drag-left': { tab: codeTabKey, hover: { over: 'half', side: 'left' } },
  'drag-right': { tab: second.key, hover: { over: 'half', side: 'right' } },
  'drag-pane': { tab: codeTabKey, hover: { over: 'pane' } },
  'drag-row': { tab: codeTabKey, hover: { over: 'row', index: 0 } },
}

/** The state draws a tab in the middle of a drag. */
export function hasPaneDrag(state: PaneState): boolean {
  return desktopDrags[state] !== undefined
}

/**
 * Adds the desktop drag of the state to its panes: the faint copy in the
 * row of the tab, then the drop mark over a half of the one pane or over
 * the other pane, or the line of the drop in the other row. The drop mark
 * shows at every width of the column (split panes decision 6 G).
 */
export function withDesktopDrag(panes: PanePlan[], state: PaneState): void {
  const drag = desktopDrags[state]
  const source = panes.find((pane) =>
    pane.tabs.some((tab) => tab.key === drag?.tab),
  )
  const tab = source?.tabs.find((each) => each.key === drag?.tab)
  if (!drag || !source || !tab) return
  source.drag = { tab: tab.key }
  const { hover } = drag
  if (hover.over === 'half') {
    const move: TabMove = { kind: 'new-pane', pane: hover.side }
    const status = moveStatus(tab.title, move)
    source.drop = { area: hover.side, tab, status }
    return
  }
  const target = panes.find((pane) => pane !== source)
  if (!target) return
  const index = hover.over === 'row' ? hover.index : target.tabs.length
  const move: TabMove = {
    kind: 'pane',
    pane: target.side,
    place: index + 1,
    count: target.tabs.length + 1,
  }
  if (hover.over === 'pane') {
    target.drop = { area: 'pane', tab, status: moveStatus(tab.title, move) }
    return
  }
  target.drag = { tab: tab.key, index, from: tab, move }
}

/**
 * The long press of a phone, which has no drop on the content: the second
 * session at its place over one pane, or across the border into the end of
 * the left part over a split. The left part then takes it as its last tab.
 */
export function phoneDrag(row: OneRow, split: boolean): TabDrag | undefined {
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
