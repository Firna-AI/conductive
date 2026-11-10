import type {
  ComponentPropsWithRef,
  HTMLAttributes,
  ReactNode,
  RefCallback,
} from 'react'
import { nameLabel } from '../../shared/name-label'
import type { Session } from '../../shared/sessions'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { rowTabs, tabKey } from '../state/tab-order'

/**
 * A tab of the saved view that is not a session: a file, a diff, or an old
 * session from Conductor. The host of the chat draws it.
 */
type HostTab = Exclude<WorkspaceTab, { kind: 'session' }>

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
 * What the row asks the host to draw for a tab of the host: the tab at its
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

/**
 * A tab of the host as the host renders it. `title` is the name of the tab,
 * as a screen reader reads it from the tab, with each secret value hidden:
 * the tab menu and the status of the row name the tab by it, and the row
 * takes no name from a path. `draw` draws the tab by the same name, as
 * `TabDraw` asks.
 */
export interface RenderedTab {
  title: string
  draw: (draw: TabDraw) => ReactNode
}

/**
 * Renders a tab of the host, as `RenderedTab` says, or gives null for a tab
 * that the host does not draw now, such as a file tab of an archived
 * workspace. The saved view keeps such a tab.
 */
export type RenderTab = (tab: HostTab) => RenderedTab | null

/** A session tab, which the chat draws. */
export interface SessionTab {
  kind: 'session'
  id: string
  /** The name that the tab shows: the title, or Untitled. */
  title: string
  /** The title of the session, or null while it has none. */
  name: Session['title']
  /** The tab shows as the current one. */
  selected: boolean
}

/** A tab of the host, which the host names and draws. */
interface HostRowTab extends RenderedTab {
  kind: 'host'
  tab: HostTab
  /** The host shows the tab as the current one, in place of the chat. */
  selected: boolean
}

/** A tab of the row: a session tab, or a tab of the host. */
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

/**
 * The tab that shows as the current one, if any: the tab of the open session
 * of the chat, or, while the host shows a `page` in place of the chat, the
 * tab of the host that the view makes active, such as a file or an old
 * session from Conductor.
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
 * the current one, if any, as `shownTab` gives it. `renderTab` names and
 * draws the tabs of the host. Without it, the row holds only the session
 * tabs. A saved tab that the host does not draw stays in the saved view,
 * and the row does not draw it.
 */
export function rowOf(
  view: WorkspaceView | null,
  sessions: readonly Session[],
  shown: WorkspaceTab | null,
  renderTab: RenderTab | undefined,
): RowTab[] {
  const titles = new Map(sessions.map((item) => [item.id, item.title]))
  const current = shown === null ? null : tabKey(shown)
  const host = renderTab !== undefined
  return rowTabs(view, sessions, host).flatMap((tab): RowTab[] => {
    const selected = tabKey(tab) === current
    if (tab.kind === 'session') {
      if (!titles.has(tab.sessionId)) return []
      const name = titles.get(tab.sessionId) ?? null
      const title = nameLabel(name)
      return [{ kind: 'session', id: tab.sessionId, title, name, selected }]
    }
    // Without a host, `rowTabs` gives no tab of the host.
    const rendered = renderTab?.(tab) ?? null
    return rendered ? [{ kind: 'host', tab, selected, ...rendered }] : []
  })
}
