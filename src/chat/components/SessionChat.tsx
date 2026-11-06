import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, MessageSquarePlus } from 'lucide-react'
import type { Agent } from '../../shared/agents'
import type { WorkspaceState } from '../../shared/workspaces'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import waitStyles from '../../../docs/mockups/src/components/workspace/SandboxNotice.module.css'
import { sendBlock } from '../state/blockers'
import { sessionState, type ChatSnapshot } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { modelLabel } from '../state/format'
import { ActionButton } from '../ui/actions'
import { ChatPane } from './ChatPane'
import { ActionNotice, BlockNotice } from './ChatNotices'
import { Composer } from './Composer'
import { SandboxBar, StartingCard, type SandboxProblem } from './SandboxState'
import { TranscriptView } from './TranscriptView'

function Waiting(props: { text: string }) {
  const theme = useSharedUiTheme()
  return (
    <div className={waitStyles.waiting}>
      <Spinner color={theme.colors.muted} size={13} />
      {props.text}
    </div>
  )
}

function problemOf(state: WorkspaceState | undefined): SandboxProblem | null {
  return state === 'stopped' || state === 'error' || state === 'archived'
    ? state
    : null
}

export interface SessionChatProps {
  snapshot: ChatSnapshot
  controller: ChatController
  mobile: boolean
  now: number
  onOpenDiff?: (path: string) => void
  onConnectAgent?: (agent: Agent) => void
  onAddBoatKey?: () => void
}

function emptyView(props: SessionChatProps): ReactNode {
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
  if (load.state === 'loading' || !workspace)
    return <Waiting text="Loading the chat" />
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
  if (state.transcript.items.length > 0 || state.pending.length > 0) return null
  if (state.transcript.turn || workspace.state === 'starting') return null
  if (state.hydration === 'loading')
    return <Waiting text="Loading the session" />
  if (state.hydration === 'failed') {
    return (
      <EmptyState
        action={
          <ActionButton onPress={() => void controller.loadHistory(id)}>
            Try again
          </ActionButton>
        }
        icon={CircleAlert}
        title="This session didn't load"
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

/**
 * The chat of the open session: its history, with the start steps while the
 * sandbox starts, and under it the notices and the composer, or the bar that
 * takes the composer's place while the sandbox does not run.
 */
export function SessionChat(props: SessionChatProps) {
  const { snapshot, controller, now } = props
  const { workspace } = snapshot
  const id = snapshot.activeSessionId
  const session = snapshot.sessions.find((item) => item.id === id) ?? null
  const state = sessionState(snapshot, id ?? '')
  const problem = problemOf(workspace?.state)
  const block = sendBlock(snapshot, id)
  const { notice } = snapshot
  const shownNotice =
    notice && (notice.sessionId === null || notice.sessionId === id)
      ? notice
      : null
  const hasMessages =
    state.pending.length > 0 ||
    state.transcript.items.some((item) => item.kind === 'user')
  const footer = (
    <>
      {shownNotice ? (
        <ActionNotice
          notice={shownNotice}
          onDismiss={controller.dismissNotice}
        />
      ) : null}
      {!problem && session && block ? (
        <BlockNotice
          block={block}
          model={modelLabel(snapshot.models, session.choice)}
          onAddBoatKey={props.onAddBoatKey}
          onConnectAgent={props.onConnectAgent}
          org={snapshot.org}
        />
      ) : null}
      {problem && workspace ? (
        <SandboxBar
          archivedAt={workspace.archivedAt}
          busy={snapshot.resuming}
          onResume={() => void controller.resume()}
          problem={problem}
        />
      ) : null}
      {!problem && session && snapshot.load.state === 'ready' ? (
        <Composer
          attaching={state.draft.uploads > 0}
          blocked={block !== null}
          choice={session.choice}
          draft={state.draft}
          models={snapshot.models}
          onAttach={(files) => void controller.attachFiles(session.id, files)}
          onChangeText={(text) => controller.setDraft(session.id, text)}
          onChooseModel={(choice) =>
            void controller.chooseModel(session.id, choice)
          }
          onRemoveAttachment={(file) =>
            controller.removeAttachment(session.id, file)
          }
          onSend={() => void controller.send(session.id)}
          onStop={() => void controller.interrupt(session.id)}
          running={state.transcript.turn !== null}
          sending={state.draft.sending}
          sessionAgent={hasMessages ? session.choice.agent : undefined}
          stopping={state.stopping}
        />
      ) : null}
    </>
  )
  return (
    <ChatPane empty={emptyView(props)} footer={footer} mobile={props.mobile}>
      <TranscriptView
        now={now}
        onOpenDiff={props.onOpenDiff}
        onRetry={(messageId) => id && void controller.retry(id, messageId)}
        pending={state.pending}
        readOnly={workspace?.state === 'archived'}
        retrying={state.retrying}
        transcript={state.transcript}
      >
        {workspace?.state === 'starting' ? (
          <StartingCard now={now} start={snapshot.start} />
        ) : null}
      </TranscriptView>
    </ChatPane>
  )
}
