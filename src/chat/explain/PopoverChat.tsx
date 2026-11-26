import { useMemo, useRef } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import { popoverChatLabel } from '../../ui/components/explain/explainCopy'
import { modelLabel } from '../../shared/agents'
import { turnCopy } from '../../shared/transcript/turn-words'
import { ChatPane } from '../components/ChatPane'
import type { FieldHandle } from '../components/chip-field/focus-plugins'
import {
  ActionNotice,
  BlockNotice,
  LinkedSessionNotice,
  ReopenNotice,
} from '../components/ChatNotices'
import { ComposerPlace, useComposerPlace } from '../components/composer-place'
import {
  sandboxParts,
  useSessionParts,
  type ChatHost,
} from '../components/session-parts'
import {
  EarlierLoading,
  historyStatus,
  HistoryFailure,
  Waiting,
} from '../components/SessionStatus'
import { TranscriptView } from '../components/TranscriptView'
import { sendBlock } from '../state/blockers'
import {
  sessionState,
  type ChatSnapshot,
  type SessionState,
} from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { loginReader, sessionLoginOf } from '../state/session-login'
import { FollowUpField } from './FollowUpField'

export interface PopoverChatProps {
  snapshot: ChatSnapshot
  controller: ChatController
  /** The session that the popover shows. */
  sessionId: string
  /** The session shows its written prompt, which the popover leaves out. */
  explanation: boolean
  readOnly: boolean
  mobile: boolean
  host?: ChatHost
  onOpenDiff?: (path: string) => void
  onConnectAgent?: (agent: Agent) => void
  /** Opens a session that a line names, such as the source of a link. */
  onOpenSession: (sessionId: string) => void
  /** Sends the draft of the session, as `ChatController.followUp` does. */
  onSend: () => void
  /** Sends the message of a failed turn again, as `ChatController.retry` does. */
  onRetry: (messageId: string) => void
}

/**
 * The written prompt of an explanation: its first message. The tab of the
 * explanation shows it as a normal message, so the popover leaves it out.
 */
function promptOf(state: SessionState): string | null {
  const first = state.transcript.items.find((item) => item.kind === 'user')
  if (first?.kind === 'user') return first.message.id
  return state.pending[0]?.id ?? null
}

/**
 * The chat of an explanation in its popover, as its tab shows it: the work
 * of each turn, the answers, the follow-up messages, the notice of a failed
 * turn with Try again, the line of a stopped turn, and the steps of the
 * start while the cloud computer starts. It leaves out the written prompt.
 * Its foot holds the notices of the session, the requests that wait for a
 * member, and the follow-up field. While the cloud computer does not run,
 * the bar of a tab, such as the bar with Resume, takes the place of the
 * field, as it takes the place of the composer. After a failed first start,
 * the field stays under it. The place of the composer holds the bar and the
 * field, as `useComposerPlace` says. A closed explanation names how it
 * opens again over the field. A read-only workspace shows the chat to read,
 * with no field.
 */
export function PopoverChat(props: PopoverChatProps) {
  const { snapshot, controller, sessionId, readOnly } = props
  const records = [...snapshot.sessions, ...snapshot.history]
  const session = records.find((item) => item.id === sessionId) ?? null
  const state = sessionState(snapshot, sessionId)
  const files = useMemo(
    () => controller.draftFiles(state.draft.id),
    [controller, state.draft.id],
  )
  const sent = useMemo(
    () => state.pending.map((message) => message.id),
    [state.pending],
  )
  const { starting, sandboxBar, keepsComposer } = sandboxParts(props)
  // The bar of a sandbox that does not run takes the place of the field, as
  // in a tab. A read-only workspace shows no field, so no bar either.
  const down = readOnly || (sandboxBar !== null && !keepsComposer)
  const field = useRef<FieldHandle>(null)
  const { place: composerPlace, focus: focusComposer } = useComposerPlace(field)
  const parts = useSessionParts({
    snapshot,
    controller,
    sessionId,
    session,
    state,
    readOnly,
    onOpenSession: props.onOpenSession,
    focusComposer,
  })
  const closed = !snapshot.sessions.some((item) => item.id === sessionId)
  const login = session ? sessionLoginOf(session, loginReader(snapshot)) : null
  const block = sendBlock(snapshot, sessionId)
  const notice =
    snapshot.notice?.sessionId === sessionId ? snapshot.notice : null
  const status = historyStatus(state)
  const prompt = props.explanation ? promptOf(state) : null
  const content =
    starting !== null ||
    state.transcript.turn !== null ||
    state.transcript.items.some(
      (item) => item.kind !== 'user' || item.message.id !== prompt,
    ) ||
    state.pending.some((message) => message.id !== prompt)
  const empty =
    status === 'failed' ? (
      <HistoryFailure
        besideContent={false}
        onRetry={() => void controller.loadHistory(sessionId)}
      />
    ) : (
      <Waiting
        text={session?.activeTurnId ? turnCopy.working : 'Loading the session'}
      />
    )
  const footer = (
    <>
      {content && status === 'failed' ? (
        <HistoryFailure
          besideContent
          onRetry={() => void controller.loadHistory(sessionId)}
        />
      ) : null}
      {notice ? (
        <ActionNotice notice={notice} onDismiss={controller.dismissNotice} />
      ) : null}
      {!down && session && block ? (
        <BlockNotice
          block={block}
          model={modelLabel(snapshot.models, session.choice)}
          onConnectAgent={props.onConnectAgent}
          watch={controller.watchMissingLogin}
        />
      ) : null}
      {!down && session && !block && login?.kind === 'linked' ? (
        <LinkedSessionNotice
          agent={session.choice.agent}
          owner={login.owner}
          reason={login.reason}
        />
      ) : null}
      {parts.waiting}
      <ComposerPlace ref={composerPlace}>
        {readOnly ? null : sandboxBar}
        {closed && !down ? <ReopenNotice /> : null}
        {down ? null : (
          <FollowUpField
            blocked={block !== null}
            draft={state.draft}
            fieldRef={field}
            files={files}
            onChangeText={(text) => controller.setDraft(sessionId, text)}
            onSend={props.onSend}
            onStop={() => void controller.interrupt(sessionId)}
            running={state.transcript.turn !== null}
            stopping={state.stopping}
          />
        )}
      </ComposerPlace>
    </>
  )
  return (
    <ChatPane
      compact
      empty={content ? null : empty}
      footer={footer}
      label={popoverChatLabel}
      mobile={props.mobile}
      sent={sent}
    >
      {status === 'loading' ? <EarlierLoading /> : null}
      <TranscriptView
        hide={prompt}
        inserts={parts.inserts}
        onOpenDiff={props.onOpenDiff}
        onRetry={props.onRetry}
        pending={state.pending}
        readers={parts.readers}
        readOnly={readOnly}
        retrying={state.retrying}
        transcript={state.transcript}
      >
        {starting}
      </TranscriptView>
    </ChatPane>
  )
}
