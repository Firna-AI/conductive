import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, MessageSquarePlus } from 'lucide-react'
import type { Workspace } from '../../shared/workspaces'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import waitStyles from '../../../docs/mockups/src/components/workspace/SandboxNotice.module.css'
import {
  sessionState,
  type ChatSnapshot,
  type SessionState,
} from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { ActionButton } from '../ui/actions'

/** The state of a session's stored history, from its history load alone. */
export function historyStatus(
  state: SessionState,
): 'loading' | 'failed' | null {
  return state.hydration === 'loading' || state.hydration === 'failed'
    ? state.hydration
    : null
}

/** The chat shows something: messages, a running turn, or the start steps. */
export function showsContent(
  state: SessionState,
  workspace: Workspace | null,
): boolean {
  return (
    state.transcript.items.length > 0 ||
    state.pending.length > 0 ||
    state.transcript.turn !== null ||
    workspace?.state === 'starting'
  )
}

/**
 * The stored history of a session did not load, with Try again. In place of
 * an empty chat it names the session. Beside content, it is a notice by the
 * composer, so a long chat cannot scroll it out of view, and the content
 * stays.
 */
export function HistoryFailure(props: {
  besideContent: boolean
  onRetry: () => void
}) {
  const retry = <ActionButton onPress={props.onRetry}>Try again</ActionButton>
  if (props.besideContent) {
    return (
      <Notice
        action={retry}
        icon={CircleAlert}
        title="Earlier messages didn't load"
        tone="danger"
      />
    )
  }
  return (
    <EmptyState
      action={retry}
      icon={CircleAlert}
      title="This session didn't load"
    />
  )
}

/** The earlier part of a chat still loads, at the place where it will show. */
export function EarlierLoading() {
  const theme = useSharedUiTheme()
  return (
    <div className={itemStyles.event}>
      <Spinner color={theme.colors.muted} size={12} />
      Loading earlier messages
    </div>
  )
}

function Waiting(props: { text: string }) {
  const theme = useSharedUiTheme()
  return (
    <div className={waitStyles.waiting}>
      <Spinner color={theme.colors.muted} size={13} />
      {props.text}
    </div>
  )
}

/**
 * What takes the place of the transcript: the load of the chat, no open
 * session, the history of a session with nothing to show yet, or a new
 * session. A chat with content shows its history status beside it.
 */
export function emptyView(props: {
  snapshot: ChatSnapshot
  controller: ChatController
}): ReactNode {
  const { snapshot, controller } = props
  const { load, workspace } = snapshot
  const id = snapshot.activeSessionId
  if (load.state === 'failed') {
    return (
      <EmptyState
        action={
          <ActionButton onPress={controller.start}>Try again</ActionButton>
        }
        body={load.message}
        icon={CircleAlert}
        title="The chat didn't load"
      />
    )
  }
  if (load.state === 'loading' || !workspace) {
    return <Waiting text="Loading the chat" />
  }
  if (!id) {
    return (
      <EmptyState
        body="Start a session with +, or reopen one from the session history."
        icon={MessageSquarePlus}
        title="No open session"
      />
    )
  }
  const state = sessionState(snapshot, id)
  if (showsContent(state, workspace)) return null
  const status = historyStatus(state)
  if (status === 'loading') return <Waiting text="Loading the session" />
  if (status === 'failed') {
    return (
      <HistoryFailure
        besideContent={false}
        onRetry={() => void controller.loadHistory(id)}
      />
    )
  }
  return (
    <EmptyState
      body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
      icon={MessageSquarePlus}
      title="New session"
    />
  )
}
