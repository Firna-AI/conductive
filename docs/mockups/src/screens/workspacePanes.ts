import type { Viewport } from '@mokly/mokly'
import type { PaneSide } from '../components/workspace/paneCopy'
import type { OneRow } from '../components/workspace/SplitColumn'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { workspaceSessions } from '../fixtures/sessions'
import {
  hasPaneDrag,
  phoneDrag,
  withDesktopDrag,
  type PanePlan,
} from './workspacePaneDrags'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey } from './workspaceTabRow'

const [first, second] = workspaceSessions

/** A state of the centre column with split panes, or with a drag to one. */
export type SplitState = Exclude<WorkspaceState['panes'], 'one'>

/** The keys of the tabs of README.md and of the diff of AddressForm.tsx. */
export const readmeTabKey = 'readme'
export const diffTabKey = 'diff'

/**
 * The keys of the tabs of each pane, the shown tab of each, the focus, and
 * the keys of the temporary tabs, at most one in each pane.
 */
type Layout = {
  panes: readonly (readonly string[])[]
  shown: readonly string[]
  focused: number
  temporary?: readonly string[]
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

/**
 * A temporary tab in each pane (split panes decision 5 B): README.md, which
 * a press opened in the left pane, and the diff of AddressForm.tsx, which a
 * later press opened in the right pane. The right pane has the focus.
 */
const temporarySplit: Layout = {
  panes: [
    [first.key, readmeTabKey],
    [second.key, diffTabKey],
  ],
  shown: [first.key, diffTabKey],
  focused: 1,
  temporary: [readmeTabKey, diffTabKey],
}

/**
 * The split of `temporarySplit` after a press on the code file. Only the
 * right pane shows a file, so its temporary tab takes the code file, in the
 * place of the diff. The left pane keeps README.md.
 */
const replacedSplit: Layout = {
  panes: [
    [first.key, readmeTabKey],
    [second.key, codeTabKey],
  ],
  shown: [first.key, codeTabKey],
  focused: 1,
  temporary: [readmeTabKey, codeTabKey],
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
  temporary: temporarySplit,
  'temporary-replaced': replacedSplit,
  'drag-left': onePane,
  'drag-right': onePane,
  'drag-pane': sessionsSplit,
  'drag-row': sessionsSplit,
}

/** The state shows two panes, which the right column gives way to. */
export function showsTwoPanes(panes: WorkspaceState['panes']): boolean {
  return panes !== 'one' && layouts[panes].panes.length > 1
}

/**
 * The files that presses opened in the temporary tabs of a split, in the
 * tabs of a view that shows file tabs.
 */
const pressedFiles: readonly WorkspaceTab[] = [
  { key: readmeTabKey, kind: 'markdown', title: 'README.md', selected: false },
  { key: diffTabKey, kind: 'diff', title: 'AddressForm.tsx', selected: false },
]

/** The panes of a state, the focused pane, and the one row of a phone. */
export type SplitPlan = { panes: PanePlan[]; focused: number; row: OneRow }

/**
 * The tabs of a pane, from the tabs that the viewport shows. A split draws
 * each tab where it is, so a tab links to no screen of one pane.
 */
function paneOf(
  tabs: readonly WorkspaceTab[],
  keys: readonly string[],
  pane: { side: PaneSide; shown: string; layout: Layout; menuTab?: string },
): PanePlan {
  const temporary = pane.layout.temporary ?? []
  const own = tabs.flatMap((tab) =>
    keys.includes(tab.key)
      ? [
          {
            ...tab,
            to: undefined,
            selected: tab.key === pane.shown,
            temporary: tab.temporary === true || temporary.includes(tab.key),
          },
        ]
      : [],
  )
  const holds = (key?: string) => own.some((tab) => tab.key === key)
  return {
    side: pane.side,
    tabs: own,
    shown: holds(pane.shown) ? pane.shown : undefined,
    menuTab: holds(pane.menuTab) ? pane.menuTab : undefined,
  }
}

/**
 * The pane whose shown tab the content area of a phone shows: the focused
 * pane, or the other pane when the focused pane shows a file, because a
 * phone shows files only in its Files tab.
 */
function phoneShown(panes: readonly PanePlan[], focused: number): number {
  if (panes[focused]?.shown !== undefined) return focused
  const other = panes.findIndex((pane) => pane.shown !== undefined)
  return other < 0 ? focused : other
}

/**
 * The panes of a split state, for the tabs that the viewport shows. A view
 * that shows file tabs, unlike a phone or an archived workspace, also shows
 * the files that presses opened in the temporary tabs of the split. In the
 * one row of a phone, only the shown tab of its shown pane is selected. A
 * read-only workspace binds no drag. `menuTab` is the tab whose menu is
 * open.
 */
export function splitPlanOf(
  state: SplitState,
  tabs: readonly WorkspaceTab[],
  context: { viewport: Viewport; readOnly: boolean; menuTab?: string },
): SplitPlan {
  const layout = layouts[state]
  const files = tabs.some((tab) => tab.kind !== 'session')
  const all = files
    ? [
        ...tabs,
        ...pressedFiles.filter((file) => !tabs.some((t) => t.key === file.key)),
      ]
    : tabs
  const panes = layout.panes.map((keys, index) =>
    paneOf(all, keys, {
      side: index === 0 ? 'left' : 'right',
      shown: layout.shown[index],
      layout,
      menuTab: context.menuTab,
    }),
  )
  const { focused } = layout
  const shown = phoneShown(panes, focused)
  const split = panes.length > 1
  const row: OneRow = {
    tabs: panes.flatMap((pane, index) =>
      pane.tabs.map((tab) => ({
        ...tab,
        selected: tab.selected && index === shown,
      })),
    ),
    shown,
    border: split ? panes[0].tabs.length : undefined,
    menuTab: panes.find((pane) => pane.menuTab)?.menuTab,
  }
  if (context.readOnly || !hasPaneDrag(state)) {
    return { panes, focused, row }
  }
  if (context.viewport === 'mobile') {
    return { panes, focused, row: { ...row, drag: phoneDrag(row, split) } }
  }
  withDesktopDrag(panes, state)
  return { panes, focused, row }
}
