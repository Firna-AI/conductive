import type { Session } from '../../shared/generated/Session'
import type { ReactNode } from 'react'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { isArchived, tabSessions } from '../state/archive-view'
import { isRunning, type ChatSnapshot } from '../state/chat-snapshot'
import { paneSessionId, sessionTarget } from '../state/pane-selection'
import { rowTabs } from '../state/tab-order'
import { rowOf, type RenderTab, type RowTab } from './tab-row'

/** One pane of the centre column, as the chat draws it on desktop. */
export interface PanePlan {
  /** The index of the pane in the saved view: 0 is the left pane. */
  index: 0 | 1
  /** The tabs of its row. */
  tabs: RowTab[]
  /** The page of the host that the pane shows in place of a chat, or null. */
  page: ReactNode
  /** The session whose chat the pane shows while it shows no page. */
  sessionId: string | null
}

/** The panes of a view: one pane without a view. */
function panesOf(view: WorkspaceView | null): (0 | 1)[] {
  return view?.panes.length === 2 ? [0, 1] : [0]
}

/**
 * The panes that the column shows: each pane of the view whose row shows a
 * tab. A pane with none, such as a pane with only files in an archived
 * workspace, does not show, and the other pane fills the column. A view
 * whose rows show no tab at all shows its focused pane, empty.
 */
export function shownPanes(
  view: WorkspaceView | null,
  sessions: readonly Session[],
  files: boolean,
): (0 | 1)[] {
  const shown = panesOf(view).filter(
    (pane) => rowTabs(view, sessions, files, pane).length > 0,
  )
  return shown.length > 0 ? shown : [view?.focusedPane ?? 0]
}

/**
 * Whether the desktop column shows two panes, which the right column gives
 * way to. `files` says that the rows show the file and diff tabs.
 */
export function showsTwoPanes(
  snapshot: ChatSnapshot,
  readOnly: boolean,
  files: boolean,
): boolean {
  const sessions = tabSessions(snapshot, readOnly || isArchived(snapshot))
  return shownPanes(snapshot.view, sessions, files).length === 2
}

const sessionTab = (id: string | null): WorkspaceTab | null =>
  id === null ? null : { kind: 'session', sessionId: id }

/** The shown file or diff tab of a pane, while that pane shows a page. */
function shownPage(view: WorkspaceView | null, pane: 0 | 1) {
  const active = view?.panes[pane]?.activeTab ?? null
  return active?.kind === 'session' ? null : active
}

/**
 * The panes of the column on desktop, as `shownPanes` gives them. A pane
 * with a page of the host, at its index in `pages`, shows that page, and its
 * row marks its shown file or diff tab. Otherwise the pane shows the chat of
 * its session, as `paneSessionId` says, and its row marks that session.
 */
export function panePlans(input: {
  snapshot: ChatSnapshot
  sessions: readonly Session[]
  pages: readonly ReactNode[]
  renderTab: RenderTab | undefined
}): PanePlan[] {
  const { snapshot, sessions, renderTab } = input
  const { view } = snapshot
  const running = (id: string) => isRunning(snapshot, id)
  const files = renderTab !== undefined
  return shownPanes(view, sessions, files).map((index) => {
    const page = input.pages[index] ?? null
    const sessionId = page === null ? paneSessionId(snapshot, index) : null
    const shown = page === null ? sessionTab(sessionId) : shownPage(view, index)
    const tabs = rowOf(view, sessions, shown, running, renderTab, index)
    return { index, tabs, page, sessionId }
  })
}

/**
 * The pane whose chat leads, as `lead` of the session chat says: the
 * focused pane when it shows the chat of a session, else the other pane
 * that does, else the first pane that shows a chat. Null when every pane
 * shows a page.
 */
export function leadPane(
  plans: readonly PanePlan[],
  focused: 0 | 1,
): 0 | 1 | null {
  const chats = plans.filter((plan) => plan.page === null)
  const sessions = chats.filter((plan) => plan.sessionId !== null)
  const lead =
    sessions.find((plan) => plan.index === focused) ?? sessions[0] ?? chats[0]
  return lead?.index ?? null
}

/**
 * The one row of a phone: the session tabs of the left pane, then those of
 * the right pane. The content shows the session target, as `sessionTarget`
 * says, so only its tab is the current one.
 */
export function phoneRow(
  snapshot: ChatSnapshot,
  sessions: readonly Session[],
  renderTab: RenderTab | undefined,
): { tabs: RowTab[]; sessionId: string | null } {
  const { view } = snapshot
  const sessionId = sessionTarget(snapshot)
  const shown = sessionTab(sessionId)
  const running = (id: string) => isRunning(snapshot, id)
  const tabs = panesOf(view).flatMap((pane) =>
    rowOf(view, sessions, shown, running, renderTab, pane),
  )
  return { tabs, sessionId }
}
