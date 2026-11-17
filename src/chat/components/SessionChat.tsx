import { useMemo } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import { modelLabel } from '../../shared/agents'

import { PendingCommands } from '../device/PendingCommands'
import { DeviceLoadNotice, sessionCommands } from '../device/session-commands'
import { tabSessions } from '../state/archive-view'
import { sendBlock } from '../state/blockers'
import {
  hasMessages,
  sessionState,
  type ChatSnapshot,
} from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import {
  composerModels,
  loginLabelOf,
  sessionLoginOf,
} from '../state/session-login'
import { ChatPane } from './ChatPane'
import { placeMemory } from './chat-place'
import { ActionNotice, BlockNotice, LinkedSessionNotice } from './ChatNotices'
import { Composer, type ComposerFocus } from './Composer'
import { sandboxParts, type ChatHost } from './sandbox-parts'
import {
  EarlierLoading,
  emptyView,
  historyStatus,
  HistoryFailure,
  showsContent,
} from './SessionStatus'
import { sourceInsert } from './SourceLine'
import { TranscriptView } from './TranscriptView'
import { sessionTarget } from '../state/pane-selection'

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
  /** The composer takes the focus when it shows, as `ComposerFocus` says. */
  composerFocus?: ComposerFocus | null
  /**
   * The session that the chat shows, or null for none, as `paneSessionId`
   * gives it for a pane. Without it, the chat shows the session target, as
   * the chat of a phone does.
   */
  sessionId?: string | null
  /**
   * The chat leads the column: its composer takes the session keys, and it
   * shows the notices that name no session. With two panes, only the chat
   * of the pane that the session keys use leads. By default it leads.
   */
  lead?: boolean
  /**
   * The column draws the bar of the sandbox once, below both panes, so the
   * chat leaves it out. The bar still takes the place of the composer.
   */
  barBelow?: boolean
}

/**
 * The attached files of a draft, which the chips of its field show: one
 * source for each identity of the draft. A draft that moves to another
 * session keeps its identity, so its field keeps the source, and the source
 * finds the files of the draft also during the move.
 */
function useDraftFiles(controller: ChatController, draftId: string) {
  return useMemo(() => controller.draftFiles(draftId), [controller, draftId])
}

/**
 * The chat of the session of a pane: its history, with the start steps while
 * the sandbox starts, and under it the notices and the composer, or the bar
 * that takes the composer's place while the sandbox does not run. After a
 * failed first start, the bar sits above the composer, which stays. With two
 * panes, the column draws the bar once, below both panes. The status of
 * the stored history comes from its load alone, so content never hides a
 * failed load. The composer names the login of another member that a
 * message spends. A linked session starts with a link to the session that
 * it started from. The shown record comes from the tabs, so a closed
 * session that an archived workspace shows keeps its link too. A read-only
 * workspace, archived or of a suspended org, shows no composer and no
 * control that writes.
 */
export function SessionChat(props: SessionChatProps) {
  const { snapshot, controller, now } = props
  const { workspace } = snapshot
  const readOnly = (props.readOnly ?? false) || workspace?.state === 'archived'
  const { sessionId } = props
  const id = useMemo(
    () => (sessionId === undefined ? sessionTarget(snapshot) : sessionId),
    [snapshot, sessionId],
  )
  const lead = props.lead ?? true
  const session =
    tabSessions(snapshot, readOnly).find((item) => item.id === id) ?? null
  const state = sessionState(snapshot, id ?? '')
  const files = useDraftFiles(controller, state.draft.id)
  const { starting, sandboxBar, keepsComposer } = sandboxParts(props)
  // A bar or a read-only workspace takes the place of the composer. The bar
  // of a failed first start keeps the composer under it.
  const down = (sandboxBar !== null && !keepsComposer) || readOnly
  const block = sendBlock(snapshot, id)
  const { notice } = snapshot
  const shownNotice =
    notice && (notice.sessionId === null ? lead : notice.sessionId === id)
      ? notice
      : null
  // Only this chat's own sends wait as pending messages, so each new one
  // shows the bottom of the chat.
  const sent = useMemo(
    () => state.pending.map((message) => message.id),
    [state.pending],
  )
  const place = useMemo(
    () => (id ? placeMemory(controller.places, id) : null),
    [controller, id],
  )
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
          reason={login.reason}
          starter={login.starter}
        />
      ) : null}
      {lead && snapshot.devices.load === 'failed' ? (
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
      {props.barBelow ? null : sandboxBar}
      {!down && session && snapshot.load.state === 'ready' ? (
        <Composer
          blocked={block !== null}
          choice={session.choice}
          draft={state.draft}
          files={files}
          focus={props.composerFocus}
          keys={lead}
          login={loginLabelOf(login)}
          models={composerModels(
            login,
            snapshot.models,
            snapshot.account?.agentLogins ?? [],
            session.choice,
          )}
          onAttach={(picked, refusals) =>
            controller.attachFiles(session.id, picked, refusals)
          }
          onChangeText={(text) => controller.setDraft(session.id, text)}
          onChooseModel={(choice) =>
            void controller.chooseModel(session.id, choice)
          }
          onSend={() => void controller.send(session.id)}
          onStop={() => void controller.interrupt(session.id)}
          running={state.transcript.turn !== null}
          sending={state.draft.sending}
          sessionAgent={hasMessages(state) ? session.choice.agent : undefined}
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
        sessionId: id,
        starting: starting !== null,
        readOnly,
      })}
      footer={footer}
      mobile={props.mobile}
      place={place}
      sent={sent}
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
