import type { ReactNode } from 'react'
import type { Agent } from '../../shared/agents'
import type { WorkspaceState } from '../../shared/workspaces'
import { PendingCommands } from '../device/PendingCommands'
import { DeviceLoadNotice, sessionCommands } from '../device/session-commands'
import { tabSessions } from '../state/archive-view'
import { sendBlock } from '../state/blockers'
import { sessionState, type ChatSnapshot } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { waitsForFirstStart } from '../state/first-start'
import { modelLabel } from '../state/format'
import { loginLineOf, sessionLoginOf } from '../state/session-login'
import { agentNames } from './AgentMark'
import { ChatPane } from './ChatPane'
import { ActionNotice, BlockNotice, LinkedSessionNotice } from './ChatNotices'
import { Composer } from './Composer'
import { SandboxBar, StartingCard, type SandboxProblem } from './SandboxState'
import {
  EarlierLoading,
  emptyView,
  historyStatus,
  HistoryFailure,
  showsContent,
} from './SessionStatus'
import { sourceInsert } from './SourceLine'
import { TranscriptView } from './TranscriptView'

function problemOf(state: WorkspaceState | undefined): SandboxProblem | null {
  return state === 'stopped' || state === 'error' || state === 'archived'
    ? state
    : null
}

/**
 * The parts of the chat that the app draws from its own record of the
 * workspace: the start steps at the end of the history while the sandbox
 * starts, and the bar that takes the composer's place while the sandbox is
 * down. Null leaves the place empty. Without a host, the chat draws both
 * from its own record.
 */
export interface ChatHost {
  starting: ReactNode | null
  sandboxBar: ReactNode | null
}

export interface SessionChatProps {
  snapshot: ChatSnapshot
  controller: ChatController
  mobile: boolean
  now: number
  onOpenDiff?: (path: string) => void
  onConnectAgent?: (agent: Agent) => void
  host?: ChatHost
  /**
   * The host shows the workspace read-only, such as while its org is
   * suspended. The chat then shows its history and no control that writes.
   */
  readOnly?: boolean
}

/**
 * The start steps and the sandbox bar: the host's, or the chat's own. A
 * read-only chat without a host shows only the bar of an archived
 * workspace, because it offers no Resume.
 */
function sandboxParts(props: SessionChatProps): ChatHost {
  if (props.host) return props.host
  const { snapshot, controller, now } = props
  const { workspace } = snapshot
  const problem = problemOf(workspace?.state)
  const readOnly = props.readOnly ?? false
  return {
    starting:
      workspace?.state === 'starting' && !readOnly ? (
        <StartingCard now={now} start={snapshot.start} />
      ) : null,
    sandboxBar:
      problem && workspace && (problem === 'archived' || !readOnly) ? (
        <SandboxBar
          archivedAt={workspace.archivedAt}
          busy={snapshot.resuming}
          onResume={() => void controller.resume()}
          problem={problem}
        />
      ) : null,
  }
}

/**
 * The chat of the open session: its history, with the start steps while the
 * sandbox starts, and under it the notices and the composer, or the bar that
 * takes the composer's place while the sandbox does not run. The status of
 * the stored history comes from its load alone, so content never hides a
 * failed load. The composer names whose login the session uses. A linked
 * session starts with a link to the session that it started from. The
 * shown record comes from the tabs, so a closed session that an archived
 * workspace shows keeps its link too. A read-only workspace, archived or of
 * a suspended org, shows no composer and no control that writes.
 */
export function SessionChat(props: SessionChatProps) {
  const { snapshot, controller, now } = props
  const { workspace } = snapshot
  const id = snapshot.activeSessionId
  const session = tabSessions(snapshot).find((item) => item.id === id) ?? null
  const state = sessionState(snapshot, id ?? '')
  const { starting, sandboxBar } = sandboxParts(props)
  const readOnly = (props.readOnly ?? false) || workspace?.state === 'archived'
  // A bar or a read-only workspace takes the place of the composer.
  const down = sandboxBar !== null || readOnly
  const block = sendBlock(snapshot, id)
  const { notice } = snapshot
  const shownNotice =
    notice && (notice.sessionId === null || notice.sessionId === id)
      ? notice
      : null
  const hasMessages =
    state.pending.length > 0 ||
    state.transcript.items.some((item) => item.kind === 'user')
  const status = historyStatus(state)
  const content = showsContent(state, starting !== null)
  const viewerId = snapshot.account?.user.id ?? null
  const commands = sessionCommands(snapshot, id, state)
  const login = session ? sessionLoginOf(session, viewerId) : null
  const openSession = (sessionId: string) => {
    const open = snapshot.sessions.some((item) => item.id === sessionId)
    void (open ? controller.select(sessionId) : controller.reopen(sessionId))
  }
  const source = sourceInsert(snapshot, session, openSession)
  const footer = (
    <>
      {id && content && status === 'failed' ? (
        <HistoryFailure
          besideContent
          onRetry={() => void controller.loadHistory(id)}
        />
      ) : null}
      {shownNotice ? (
        <ActionNotice
          notice={shownNotice}
          onDismiss={controller.dismissNotice}
        />
      ) : null}
      {!down && session && block ? (
        <BlockNotice
          block={block}
          model={modelLabel(snapshot.models, session.choice)}
          onConnectAgent={props.onConnectAgent}
        />
      ) : null}
      {!down && session && !block && login?.kind === 'linked' ? (
        <LinkedSessionNotice
          agent={session.choice.agent}
          starter={login.starter}
        />
      ) : null}
      {snapshot.devices.load === 'failed' ? (
        <DeviceLoadNotice onRetry={() => void controller.loadDevices()} />
      ) : null}
      <PendingCommands
        devices={snapshot.devices}
        onAnswer={(requestId, action) =>
          void controller.answerCommand(requestId, action)
        }
        readOnly={readOnly}
        readers={{ viewerId, orgName: snapshot.org?.name ?? null }}
        requests={commands.waiting}
      />
      {sandboxBar}
      {!down && session && snapshot.load.state === 'ready' ? (
        <Composer
          attaching={state.draft.uploads > 0}
          blocked={block !== null}
          waits={waitsForFirstStart(snapshot)}
          choice={session.choice}
          draft={state.draft}
          login={loginLineOf(login, agentNames[session.choice.agent])}
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
          startsSession={login?.kind === 'linked'}
          stopping={state.stopping}
        />
      ) : null}
    </>
  )
  return (
    <ChatPane
      empty={emptyView({
        snapshot,
        controller,
        starting: starting !== null,
        readOnly,
      })}
      footer={footer}
      mobile={props.mobile}
    >
      {content && status === 'loading' ? <EarlierLoading /> : null}
      <TranscriptView
        inserts={source ? [source, ...commands.inserts] : commands.inserts}
        now={now}
        onOpenDiff={props.onOpenDiff}
        onRetry={(messageId) => id && void controller.retry(id, messageId)}
        pending={state.pending}
        readers={{ viewerId, members: snapshot.members }}
        readOnly={readOnly}
        retrying={state.retrying}
        transcript={state.transcript}
      >
        {starting}
      </TranscriptView>
    </ChatPane>
  )
}
