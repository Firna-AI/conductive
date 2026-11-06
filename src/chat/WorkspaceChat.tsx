import { useCallback, useEffect, type ReactNode } from 'react'
import type { Agent } from '../shared/agents'
import type { WorkspaceView } from '../shared/workspace-view'
import type { Workspace } from '../shared/workspaces'
import { TouchScreen } from '../../docs/mockups/src/components/common/touch'
import { ChatOverlays, historyEntries } from './components/ChatOverlays'
import { SessionChat } from './components/SessionChat'
import { SessionTabs } from './components/SessionTabs'
import { endedAt, historySessions, tabSessions } from './state/archive-view'
import { sessionState } from './state/chat-snapshot'
import { systemClock, useNow, type Clock } from './ui/clock'
import { useChatController, type ChatConnection } from './useChatController'
import styles from './WorkspaceChat.module.css'

export interface WorkspaceChatProps extends ChatConnection {
  /** The phone layout takes 44 px touch targets and sheets for menus. */
  viewport: 'desktop' | 'mobile'
  /** The time source for durations and relative times. */
  clock?: Clock
  /** Tabs that the app adds after the sessions, such as open files. */
  extraTabs?: ReactNode
  /** The workspace record, its state, and the title that the agent writes. */
  onWorkspaceChange?: (workspace: Workspace) => void
  /** The open tabs, as the chat saves them through the view route. */
  onViewChange?: (view: WorkspaceView) => void
  /** A file chip of a finished turn opens its diff. */
  onOpenDiff?: (path: string) => void
  /** The notice of an agent with no login leads to its Connect form. */
  onConnectAgent?: (agent: Agent) => void
  /** The notice of an org with no key leads an admin to the key screen. */
  onAddBoatKey?: () => void
}

function useReport<T>(value: T | null, report?: (value: T) => void): void {
  useEffect(() => {
    if (value !== null) report?.(value)
  }, [value, report])
}

/**
 * The chat of one workspace: the session tabs with the session history, and
 * the chat of the open session with its composer. It loads through `fetch`
 * and follows the workspace through `subscribe`. Give it a stable `fetch`
 * and `subscribe`, as `useChatController` says.
 */
export function WorkspaceChat(props: WorkspaceChatProps) {
  const { controller, snapshot } = useChatController(props)
  const mobile = props.viewport === 'mobile'
  const active = snapshot.activeSessionId
  const running = active ? sessionState(snapshot, active).transcript.turn : null
  const ticking =
    running !== null ||
    snapshot.workspace?.state === 'starting' ||
    snapshot.overlay.kind === 'history'
  const now = useNow(props.clock ?? systemClock, ticking)
  useReport(snapshot.workspace, props.onWorkspaceChange)
  useReport(snapshot.view, props.onViewChange)
  const reopen = useCallback(
    (sessionId: string) => void controller.reopen(sessionId),
    [controller],
  )
  const history = historyEntries(
    historySessions(snapshot),
    now,
    reopen,
    (item) => endedAt(snapshot, item),
  )
  const { overlay } = snapshot
  const body = (
    <>
      <SessionTabs
        extraTabs={props.extraTabs}
        historyEntries={history}
        historyOpen={overlay.kind === 'history'}
        mobile={mobile}
        onCancelRename={controller.dismissOverlay}
        onClose={controller.requestClose}
        onNew={() => void controller.newSession()}
        onRename={(id, title) => void controller.rename(id, title)}
        onSelect={controller.select}
        onShowHistory={controller.showHistory}
        onStartRename={controller.startRename}
        readOnly={snapshot.workspace?.state === 'archived'}
        renaming={overlay.kind === 'rename' ? overlay.sessionId : null}
        tabs={tabSessions(snapshot).map((session) => ({
          id: session.id,
          title: session.title,
          selected: session.id === active,
        }))}
      />
      <SessionChat
        controller={controller}
        mobile={mobile}
        now={now}
        onAddBoatKey={props.onAddBoatKey}
        onConnectAgent={props.onConnectAgent}
        onOpenDiff={props.onOpenDiff}
        snapshot={snapshot}
      />
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
  if (!mobile) return <div className={styles.column}>{body}</div>
  return (
    <TouchScreen>
      <div className={styles.phone}>{body}</div>
    </TouchScreen>
  )
}
