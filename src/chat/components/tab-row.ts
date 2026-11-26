import type { Session } from '../../shared/generated/Session'
import type {
  ComponentPropsWithRef,
  HTMLAttributes,
  ReactNode,
  RefCallback,
} from 'react'
import { nameLabel } from '../../shared/name-label'

import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { isRunning, type ChatSnapshot } from '../state/chat-snapshot'
import { waitsForMember } from '../state/open-requests'
import { rowTabs, tabKey } from '../state/tab-order'

/** A file, diff, or Preview tab of the saved view. The host draws it. */
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

/**
 * A file or diff tab as the host renders it. `title` is the name of the tab,
 * as a screen reader reads it from the tab, with each secret value hidden:
 * the tab menu and the status of the row name the tab by it, and the row
 * takes no name from a path. `draw` draws the tab by the same name, as
 * `TabDraw` asks. `show` shows the tab, as a plain click on its link does,
 * for the keys of Previous tab and Next tab. `keep` keeps the temporary tab
 * in its place, as a double-click on the tab does, for Keep open of its tab
 * menu. It is null for each kept tab, whose menu has no Keep open.
 * `copyPath` copies the real path of the file of the tab, during the press
 * of Copy path in its tab menu, because the chat knows only the title. It
 * is null for a tab whose label hides a secret value, or is not known yet,
 * whose menu has no Copy path.
 */
export interface RenderedTab {
  title: string
  draw: (draw: TabDraw) => ReactNode
  show: () => void
  keep: (() => void) | null
  copyPath: (() => void) | null
}

/** Renders a file or diff tab of the host, as `RenderedTab` says. */
export type RenderTab = (tab: HostTab) => RenderedTab

/** A session tab, which the chat draws. */
export interface SessionTab {
  kind: 'session'
  id: string
  /** The name that the tab shows: the title, or Untitled. */
  title: string
  /** The title of the session, or null while it has none. */
  name: Session['title']
  /** The session runs a turn, so its tab shows the spinner. */
  running: boolean
  /**
   * The session holds an open request, so its tab shows the needs-input
   * mark in place of its icon, also in place of the spinner.
   */
  needsInput: boolean
  /** The tab shows as the current one. */
  selected: boolean
}

/** What the icon of the tab of each session shows, by the ID of the session. */
interface SessionMarks {
  running: (sessionId: string) => boolean
  needsInput: (sessionId: string) => boolean
}

/**
 * The marks of the session tabs from the chat: a running turn, and an open
 * request of the session, as `waitsForMember` says. Each tab gets them, also
 * the shown tab.
 */
export function sessionMarks(snapshot: ChatSnapshot): SessionMarks {
  return {
    running: (sessionId) => isRunning(snapshot, sessionId),
    needsInput: (sessionId) => waitsForMember(snapshot, sessionId),
  }
}

/** A file or diff tab, which the host names and draws. */
interface HostRowTab extends RenderedTab {
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
 * the current one, if any, as `shownTab` gives it. `renderTab` names and
 * draws the file and diff tabs of the host. Without it, the row holds only
 * the session tabs. `marks` reads the running turn and the open requests of
 * each session.
 */
export function rowOf(
  view: WorkspaceView | null,
  sessions: readonly Session[],
  shown: WorkspaceTab | null,
  marks: SessionMarks,
  renderTab: RenderTab | undefined,
): RowTab[] {
  const records = new Map(sessions.map((item) => [item.id, item]))
  const current = shown === null ? null : tabKey(shown)
  const host = renderTab !== undefined
  return rowTabs(view, sessions, host).flatMap((tab): RowTab[] => {
    const selected = tabKey(tab) === current
    if (tab.kind === 'session') {
      const session = records.get(tab.sessionId)
      if (!session) return []
      const name = session.title
      const title = nameLabel(name)
      return [
        {
          kind: 'session',
          id: tab.sessionId,
          title,
          name,
          selected,
          running: marks.running(session.id),
          needsInput: marks.needsInput(session.id),
        },
      ]
    }
    // Without a host, `rowTabs` gives no file or diff tab.
    return renderTab ? [{ kind: 'host', tab, selected, ...renderTab(tab) }] : []
  })
}
