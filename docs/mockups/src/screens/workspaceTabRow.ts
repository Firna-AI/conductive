import type { Viewport } from '@mokly/mokly'
import { nameLabel } from '../../../../src/shared/name-label'
import type { TabKind, WorkspaceTab } from '../components/workspace/TabItem'
import type { TabDrag } from '../components/workspace/WorkspaceTabs'
import {
  moreSessions,
  workspaceSessions,
  type Session,
} from '../fixtures/sessions'
import type { WorkspaceState } from './workspaceState'

const [firstSession, secondSession] = workspaceSessions

/** The key of the tab of the code file that stays open. */
export const codeTabKey = 'code'

function sessionTab(session: Session): WorkspaceTab {
  const { key, title } = session
  return { key, kind: 'session', title: nameLabel(title), selected: false }
}

function fileTab(key: string, kind: TabKind, title: string): WorkspaceTab {
  return { key, kind, title, selected: false }
}

/**
 * The tabs that fill a full row after the first sessions and the code file:
 * more sessions and files, each opened at the end of the row.
 */
export const moreTabs: readonly WorkspaceTab[] = [
  sessionTab(moreSessions[0]),
  fileTab('page', 'code', 'page.tsx'),
  sessionTab(moreSessions[1]),
  fileTab('address-test', 'code', 'address.test.ts'),
  sessionTab(moreSessions[2]),
  fileTab('postcode', 'diff', 'postcodeLookup.ts'),
  sessionTab(moreSessions[3]),
  fileTab('layout', 'code', 'layout.tsx'),
]

/** The row after the drag: the code file between the first two tabs. */
export function withCodeMoved(tabs: readonly WorkspaceTab[]): WorkspaceTab[] {
  const code = tabs.find((tab) => tab.key === codeTabKey)
  if (!code) return [...tabs]
  return tabs.filter((tab) => tab !== code).toSpliced(1, 0, code)
}

/**
 * The drag of each viewport, with the line between the two sessions. On
 * desktop the code file lands there. A phone shows only the sessions, so a
 * long press lifts the second session, and the line marks its place until
 * the finger moves.
 */
function dragOf(
  tabs: readonly WorkspaceTab[],
  viewport: Viewport,
): TabDrag | undefined {
  const index = tabs.findIndex((tab) => tab.key === secondSession.key)
  if (index < 0) return undefined
  const tab = viewport === 'mobile' ? secondSession.key : codeTabKey
  return { tab, index }
}

/**
 * What the tab row draws over its tabs: a drag, a tab menu, a rename field,
 * or a full row.
 */
export type TabRow = {
  drag?: TabDrag
  /** The tab whose menu is open: the first session, which does not show. */
  menuTab?: string
  /** The tab that shows the rename field: the first session too. */
  renaming?: string
  /** The tabs do not fit, so the row scrolls to the tab that it keeps. */
  full: boolean
}

/**
 * The tab row of the state, for the tabs that the viewport shows. A
 * read-only workspace moves no tab, opens no tab menu, and renames no
 * session. On a phone, the tab with the rename field and the shown tab do
 * not fit beside each other, so the row is full and keeps the field in
 * view.
 */
export function tabRowOf(
  state: WorkspaceState,
  tabs: readonly WorkspaceTab[],
  viewport: Viewport,
  readOnly: boolean,
): TabRow {
  if (readOnly) return { full: state.tabRow === 'full' }
  const renaming = state.tabRow === 'rename' ? firstSession.key : undefined
  return {
    drag: state.tabRow === 'drag' ? dragOf(tabs, viewport) : undefined,
    menuTab: state.overlay === 'tab-menu' ? firstSession.key : undefined,
    renaming,
    full:
      state.tabRow === 'full' ||
      (renaming !== undefined && viewport === 'mobile'),
  }
}
