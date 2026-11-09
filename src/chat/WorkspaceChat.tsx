import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { Agent } from '../shared/agents'
import type { WorkspaceView } from '../shared/workspace-view'
import type { Workspace } from '../shared/workspaces'
import { TouchScreen } from '../../docs/mockups/src/components/common/touch'
import { ChatOverlays, historyEntries } from './components/ChatOverlays'
import { SessionChat, type ChatHost } from './components/SessionChat'
import { SessionTabs } from './components/SessionTabs'
import { rowOf, shownTab, type RenderTab } from './components/tab-row'
import { LinksProvider, type ChatLinks } from './links/LinksContext'
import { endedAt, historySessions, tabSessions } from './state/archive-view'
import { sessionState, type ChatSnapshot } from './state/chat-snapshot'
import type { ChatController } from './state/controller'
import { systemClock, useNow, type Clock } from './ui/clock'
import { useChatController, type ChatConnection } from './useChatController'
import styles from './WorkspaceChat.module.css'

/** How the chat shows, and what it tells the app. */
export interface ChatViewProps {
  /** The phone layout takes 44 px touch targets and sheets for menus. */
  viewport: 'desktop' | 'mobile'
  /** The time source for durations and relative times. */
  clock?: Clock
  /**
   * Names and draws a file or diff tab of the saved view at its place in the
   * tab row, as `RenderTab` says. Without it, the row shows only the session
   * tabs, as on a phone.
   */
  renderTab?: RenderTab
  /**
   * A page that the app shows in place of the chat of the open session, such
   * as an open file. The session tabs and the overlays stay, and no session
   * tab shows as the current one.
   */
  content?: ReactNode
  /** The workspace record, its state, and the title from its first message. */
  onWorkspaceChange?: (workspace: Workspace) => void
  /** The open tabs, as the chat saves them through the view route. */
  onViewChange?: (view: WorkspaceView) => void
  /** A file chip of a finished turn opens its diff. */
  onOpenDiff?: (path: string) => void
  /**
   * A plain click on a workspace chip in a message or an answer opens the
   * page of its link, such as through the navigation of the app. Without
   * it, a chip is a plain link that the browser opens.
   */
  onOpenPage?: (to: string) => void
  /** The notice of an agent with no login leads to its Connect form. */
  onConnectAgent?: (agent: Agent) => void
  /** The start steps and the sandbox bar that the app draws, as `ChatHost` says. */
  host?: ChatHost
  /**
   * The app shows the workspace read-only, such as while its org is
   * suspended. The chat then shows its history, changes its tabs in the
   * browser only, and sends no write. An archived workspace is read-only
   * without it.
   */
  readOnly?: boolean
}

export interface WorkspaceChatProps extends ChatConnection, ChatViewProps {}

function useReport<T>(value: T | null, report?: (value: T) => void): void {
  useEffect(() => {
    if (value !== null) report?.(value)
  }, [value, report])
}

/**
 * The workspaces that the chips of the chat find, as the list of the org has
 * them now, and the way that a chip opens its page.
 */
function useLinks(
  controller: ChatController,
  open: ((to: string) => void) | undefined,
): ChatLinks {
  const list = controller.workspaceList.workspaces
  const workspaces = useSyncExternalStore(list.subscribe, list.get, list.get)
  const { orgId } = controller.target
  const links = useMemo(() => ({ orgId, workspaces }), [orgId, workspaces])
  return useMemo(() => ({ links, open }), [links, open])
}

/** The session tabs, the chat of the open session, and the overlays. */
function ChatBody(
  props: ChatViewProps & { controller: ChatController; snapshot: ChatSnapshot },
) {
  const { controller, snapshot } = props
  const readOnly =
    snapshot.workspace?.state === 'archived' || (props.readOnly ?? false)
  const mobile = props.viewport === 'mobile'
  const content = props.content ?? null
  const active = snapshot.activeSessionId
  const running = active ? sessionState(snapshot, active).transcript.turn : null
  const ticking =
    running !== null ||
    snapshot.workspace?.state === 'starting' ||
    snapshot.overlay.kind === 'history'
  const now = useNow(props.clock ?? systemClock, ticking)
  const links = useLinks(controller, props.onOpenPage)
  useReport(snapshot.workspace, props.onWorkspaceChange)
  useReport(snapshot.view, props.onViewChange)
  const reopen = useCallback(
    (sessionId: string) => void controller.reopen(sessionId),
    [controller],
  )
  const history = historyEntries(
    historySessions(snapshot, readOnly),
    now,
    reopen,
    (item) => endedAt(snapshot, item),
  )
  const { overlay } = snapshot
  const body = (
    <>
      <SessionTabs
        historyEntries={history}
        historyOpen={overlay.kind === 'history'}
        mobile={mobile}
        onCancelRename={controller.dismissOverlay}
        onClose={controller.requestClose}
        onMove={controller.moveTab}
        onNew={() => void controller.newSession()}
        onRename={(id, title) => void controller.rename(id, title)}
        onSelect={controller.select}
        onShowHistory={controller.showHistory}
        onStartRename={controller.startRename}
        readOnly={readOnly}
        renaming={overlay.kind === 'rename' ? overlay.sessionId : null}
        tabs={rowOf(
          snapshot.view,
          tabSessions(snapshot),
          shownTab(snapshot.view, active, content !== null),
          props.renderTab,
        )}
      />
      {content ?? (
        <SessionChat
          controller={controller}
          host={props.host}
          mobile={mobile}
          now={now}
          onConnectAgent={props.onConnectAgent}
          onOpenDiff={props.onOpenDiff}
          readOnly={readOnly}
          snapshot={snapshot}
        />
      )}
      <ChatOverlays
        history={history}
        mobile={mobile}
        onConfirmClose={controller.confirmClose}
        onDismiss={controller.dismissOverlay}
        overlay={overlay}
        sessions={snapshot.sessions}
      />
    </>
  )
  if (!mobile) {
    return (
      <LinksProvider value={links}>
        <div className={styles.column}>{body}</div>
      </LinksProvider>
    )
  }
  return (
    <LinksProvider value={links}>
      <TouchScreen>
        <div className={styles.phone}>{body}</div>
      </TouchScreen>
    </LinksProvider>
  )
}

/**
 * The chat of one workspace: the session tabs with the session history, and
 * the chat of the open session with its composer. It loads through `client`
 * and follows the workspace through `subscribe`. Give it a stable `client`
 * and `subscribe`, as `useChatController` says.
 */
export function WorkspaceChat(props: WorkspaceChatProps) {
  const { controller, snapshot } = useChatController(
    props,
    props.readOnly ?? false,
  )
  return <ChatBody {...props} controller={controller} snapshot={snapshot} />
}

/**
 * The chat of a controller that the app keeps, such as across the pages of
 * a tab. The app shows and hides the controller itself, as
 * `ChatController.show` says. This view only draws it.
 */
export function WorkspaceChatView(
  props: ChatViewProps & { controller: ChatController },
) {
  const { controller } = props
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  return <ChatBody {...props} snapshot={snapshot} />
}
