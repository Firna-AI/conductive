import type {
  ComponentPropsWithRef,
  HTMLAttributes,
  ReactNode,
  RefCallback,
} from 'react'
import type { Session } from '../../shared/sessions'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { rowTabs, tabKey } from '../state/tab-order'

/** A file or diff tab of the saved view. The host of the chat draws it. */
export type HostTab = Exclude<WorkspaceTab, { kind: 'session' }>

/**
 * The props that the row gives the list item of a tab: the handlers and the
 * classes of a drag and of the tab menu, and the ref of the box that a drag
 * measures and the row scrolls into view.
 */
export type TabItemProps = ComponentPropsWithRef<'li'>

/**
 * The props that the row gives the link of a tab, the link or the button
 * that shows it: the ref that gives it the focus back after a move from the
 * tab menu.
 */
export interface TabLinkProps {
  ref: RefCallback<HTMLElement>
}

/**
 * The props that the row gives the wrapper of the Close button of a tab, so
 * that a press on Close starts no drag.
 */
export type TabCloseProps = HTMLAttributes<HTMLElement>

/**
 * What the row asks the host to draw for a file or diff tab: the tab at its
 * place, with the props of its list item, of its link, and of the wrapper of
 * its Close button, or the copy that a drag lifts above the page. The copy
 * shows the icon and the whole title of the tab, with no link and no Close.
 */
export type TabDraw =
  | {
      kind: 'row'
      item: TabItemProps
      link: TabLinkProps
      close: TabCloseProps
    }
  | { kind: 'lifted' }

/** Draws a file or diff tab of the host, as `TabDraw` asks. */
export type RenderTab = (tab: HostTab, draw: TabDraw) => ReactNode

/** A session tab, which the chat draws. */
export interface SessionTab {
  kind: 'session'
  id: string
  title: string
  /** The tab shows as the current one. */
  selected: boolean
}

/** A file or diff tab, which the host draws. */
export interface HostRowTab {
  kind: 'host'
  tab: HostTab
  /** The host shows the tab as the current one, in place of the chat. */
  selected: boolean
}

/** A tab of the row: a session tab, or a file or diff tab of the host. */
export type RowTab = SessionTab | HostRowTab

/** The tab of the saved view that a tab of the row shows. */
export function viewTabOf(tab: RowTab): WorkspaceTab {
  return tab.kind === 'session'
    ? { kind: 'session', sessionId: tab.id }
    : tab.tab
}

/** The key of a tab of the row. A file keeps its key in both modes. */
export function rowKey(tab: RowTab): string {
  return tabKey(viewTabOf(tab))
}

/** The title of a tab: the title of its session, or the name of its file. */
export function titleOf(tab: RowTab): string {
  if (tab.kind === 'session') return tab.title
  const { path } = tab.tab
  return path.slice(path.lastIndexOf('/') + 1)
}

/**
 * The tab that shows as the current one, if any: the tab of the open session
 * of the chat, or, while the host shows a `page` in place of the chat, the
 * file or diff tab that the view makes active.
 */
export function shownTab(
  view: WorkspaceView | null,
  activeSessionId: string | null,
  page: boolean,
): WorkspaceTab | null {
  if (!page) {
    return activeSessionId === null
      ? null
      : { kind: 'session', sessionId: activeSessionId }
  }
  const active = view?.activeTab ?? null
  return active?.kind === 'session' ? null : active
}

/**
 * The tabs of the row in the saved order. `shown` is the tab that shows as
 * the current one, if any, as `shownTab` gives it. `host` says that the host
 * draws the file and diff tabs. Without it, the row holds only the session
 * tabs.
 */
export function rowOf(
  view: WorkspaceView | null,
  sessions: readonly Session[],
  shown: WorkspaceTab | null,
  host: boolean,
): RowTab[] {
  const titles = new Map(sessions.map((item) => [item.id, item.title]))
  const current = shown === null ? null : tabKey(shown)
  return rowTabs(view, sessions, host).flatMap((tab): RowTab[] => {
    const selected = tabKey(tab) === current
    if (tab.kind !== 'session') return [{ kind: 'host', tab, selected }]
    const title = titles.get(tab.sessionId)
    if (title === undefined) return []
    return [{ kind: 'session', id: tab.sessionId, title, selected }]
  })
}
