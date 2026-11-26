import { useCallback, useMemo, useRef, useState } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import { modelLabel } from '../../shared/agents'

import { DeviceLoadNotice } from '../device/session-commands'
import { ExplainContext } from '../explain/explain-context'
import { PhoneExplain } from '../explain/ExplainButton'
import { ExplainLayer } from '../explain/ExplainLayer'
import { useExplain } from '../explain/useExplain'
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
  loginReader,
  sessionLoginOf,
} from '../state/session-login'
import { ChatPane } from './ChatPane'
import type { FieldHandle } from './chip-field/focus-plugins'
import { placeMemory } from './chat-place'
import { ActionNotice, BlockNotice, LinkedSessionNotice } from './ChatNotices'
import { Composer } from './Composer'
import type { ComposerFocus } from './composer-requests'
import { sandboxParts, useSessionParts, type ChatHost } from './session-parts'
import {
  EarlierLoading,
  emptyView,
  historyStatus,
  HistoryFailure,
  showsContent,
} from './SessionStatus'
import { TranscriptView } from './TranscriptView'

export interface SessionChatProps {
  snapshot: ChatSnapshot
  controller: ChatController
  mobile: boolean
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
 * The chat of the open session: its history, with the start steps while the
 * sandbox starts, and under it the notices and the composer, or the bar that
 * takes the composer's place while the sandbox does not run. After a failed
 * first start, the bar sits above the composer, which stays. The status of
 * the stored history comes from its load alone, so content never hides a
 * failed load. The composer names the login of another member, or the org
 * login, that a message spends. A linked session starts with a link to the
 * session that it started from. The shown record comes from the tabs, so a
 * closed session that an archived workspace shows keeps its link too. A
 * read-only workspace, archived or of a suspended org, shows no composer
 * and no control that writes. The messages show the marks of their
 * explanations, and a finished selection in one of them shows Explain, as
 * `useExplain` says: by the selection on a computer, and above the composer
 * on a phone.
 */
export function SessionChat(props: SessionChatProps) {
  const { snapshot, controller } = props
  const { workspace } = snapshot
  const id = snapshot.activeSessionId
  const session = tabSessions(snapshot).find((item) => item.id === id) ?? null
  const state = sessionState(snapshot, id ?? '')
  const files = useDraftFiles(controller, state.draft.id)
  const [frame, setFrame] = useState<HTMLElement | null>(null)
  const { starting, sandboxBar, keepsComposer } = sandboxParts(props)
  const readOnly = (props.readOnly ?? false) || workspace?.state === 'archived'
  // A bar or a read-only workspace takes the place of the composer. The bar
  // of a failed first start keeps the composer under it.
  const down = (sandboxBar !== null && !keepsComposer) || readOnly
  const block = sendBlock(snapshot, id)
  const { notice, mentionRequest: mention } = snapshot
  const shownNotice =
    notice && (notice.sessionId === null || notice.sessionId === id)
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
  const field = useRef<FieldHandle>(null)
  const focusComposer = useCallback(() => field.current?.focus(), [])
  const parts = useSessionParts({
    snapshot,
    controller,
    sessionId: id,
    session,
    state,
    readOnly,
    focusComposer,
  })
  const reader = loginReader(snapshot)
  const login = session ? sessionLoginOf(session, reader) : null
  const linked =
    login?.kind === 'linked' || (login?.kind === 'missing' && login.linked)
  const explain = useExplain({
    snapshot,
    controller,
    sessionId: session?.id ?? null,
    readOnly,
    mobile: props.mobile,
  })
  const phoneExplain =
    props.mobile && explain.view?.selection && !readOnly ? (
      <PhoneExplain
        busy={explain.view.starting}
        onPress={explain.view.explain}
      />
    ) : null
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
      {snapshot.devices.load === 'failed' ? (
        <DeviceLoadNotice onRetry={() => void controller.loadDevices()} />
      ) : null}
      {readOnly ? null : props.host?.notice}
      {parts.waiting}
      {sandboxBar}
      {phoneExplain}
      {!down && session && snapshot.load.state === 'ready' ? (
        <Composer
          blocked={block !== null}
          choice={session.choice}
          draft={state.draft}
          favourites={snapshot.account?.favourites}
          fieldRef={field}
          files={files}
          focus={props.composerFocus}
          login={loginLabelOf(login)}
          mention={mention?.sessionId === session.id ? mention : null}
          models={composerModels(
            login,
            reader,
            snapshot.models,
            session.choice,
          )}
          onAttach={(picked, refusals) =>
            controller.attachFiles(session.id, picked, refusals)
          }
          onChangeText={(text) => controller.setDraft(session.id, text)}
          onChooseModel={(choice) =>
            void controller.chooseModel(session.id, choice)
          }
          onMentionTaken={controller.takeMention}
          onSend={() => void controller.send(session.id)}
          onStop={() => void controller.interrupt(session.id)}
          running={state.transcript.turn !== null}
          sending={state.draft.sending}
          sessionAgent={hasMessages(state) ? session.choice.agent : undefined}
          startsSession={linked}
          stopping={state.stopping}
          tools={props.host?.tools}
        />
      ) : null}
    </>
  )
  return (
    <>
      <ChatPane
        empty={emptyView({
          snapshot,
          controller,
          starting: starting !== null,
          readOnly,
          github: props.host?.github,
        })}
        footer={footer}
        ref={setFrame}
        mobile={props.mobile}
        place={place}
        sent={sent}
      >
        {content && status === 'loading' ? <EarlierLoading /> : null}
        <ExplainContext.Provider value={explain.view}>
          <TranscriptView
            inserts={parts.inserts}
            onOpenDiff={props.onOpenDiff}
            onRetry={parts.onRetry}
            pending={state.pending}
            readers={parts.readers}
            readOnly={readOnly}
            retrying={state.retrying}
            transcript={state.transcript}
          >
            {starting}
          </TranscriptView>
        </ExplainContext.Provider>
      </ChatPane>
      <ExplainLayer
        chat={{
          snapshot,
          controller,
          readOnly,
          mobile: props.mobile,
          host: props.host,
          onOpenDiff: props.onOpenDiff,
          onConnectAgent: props.onConnectAgent,
        }}
        state={explain}
        stopAt={frame}
      />
    </>
  )
}
