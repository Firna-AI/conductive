import { useCallback, useEffect, useState } from 'react'
import { PaneSplit } from '../../app/pane-split'
import { useFollowTabs } from '../../app/tab-places'
import { useChatLinksOf } from '../links/chat-links'
import { LinksProvider } from '../links/LinksContext'
import { useMentionCopy } from '../links/mention-copy'
import { MentionsProvider } from '../mentions/MentionsContext'
import { endedAt, historySessions, tabSessions } from '../state/archive-view'
import {
  sessionState,
  type ChatSnapshot,
  type Overlay,
} from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { shownSessionId } from '../state/pane-selection'
import { withoutTabs } from '../state/tab-order'
import { browserCopy } from '../transcript-copy'
import { systemClock, useNow } from '../ui/clock'
import { ChatOverlays, historyEntries } from './ChatOverlays'
import type { ChatViewProps } from './chat-view-props'
import { ChatPanes } from './ChatPanes'
import { useCodeCopyAction } from './code-copy'
import type { ChatProps, RowProps } from './column-parts'
import { leadPane, panePlans, phoneRow } from './pane-plan'
import { PhoneChat } from './PhoneChat'
import { sandboxParts } from './sandbox-parts'
import { useSessionLinkCopy } from './session-link-copy'
import { useTabKeys } from './tab-keys'
import { useTranscriptCopy } from './TranscriptCopy'

function useReport<T>(value: T | null, report?: (value: T) => void): void {
  useEffect(() => {
    if (value !== null) report?.(value)
  }, [value, report])
}

/**
 * The overlay that the chat shows. A read-only chat sends no write, so it
 * shows only the session history. An open rename or close question then
 * counts as none, also one that opened before the chat turned read-only.
 * The store keeps the edit.
 */
function permittedOverlay(overlay: Overlay, readOnly: boolean): Overlay {
  return readOnly && overlay.kind !== 'history' ? { kind: 'none' } : overlay
}

/**
 * The session tabs, the chats of the shown sessions or the pages of the
 * host, and the overlays: one or two panes on desktop, as `ChatPanes` says,
 * and one row with one chat on a phone, as `PhoneChat` says. Each pane is
 * the drop area of its message box, as `useChatDropArea` says.
 */
export function ChatBody(
  props: ChatViewProps & { controller: ChatController; snapshot: ChatSnapshot },
) {
  const { controller, snapshot } = props
  const readOnly =
    snapshot.workspace?.state === 'archived' || (props.readOnly ?? false)
  const overlay = permittedOverlay(snapshot.overlay, readOnly)
  const mobile = props.viewport === 'mobile'
  const sessions = tabSessions(snapshot, readOnly)
  // A phone shows one row and one chat. Desktop shows one or two panes.
  const phone = mobile ? phoneRow(snapshot, sessions, props.renderTab) : null
  const plans = phone
    ? []
    : panePlans({
        snapshot,
        sessions,
        pages: props.pages ?? [],
        renderTab: props.renderTab,
      })
  const focused = snapshot.view?.focusedPane ?? 0
  // The sessions whose chats show, for the clock of their running turns.
  const chats = phone
    ? [phone.sessionId]
    : plans.flatMap((plan) => (plan.page === null ? [plan.sessionId] : []))
  const running = chats.some(
    (id) => id !== null && sessionState(snapshot, id).transcript.turn !== null,
  )
  const ticking =
    running ||
    snapshot.workspace?.state === 'starting' ||
    overlay.kind === 'history'
  const now = useNow(props.clock ?? systemClock, ticking)
  const links = useChatLinksOf(controller, snapshot, props.onOpenPage)
  const copyServices = props.copy ?? browserCopy
  const copy = useTranscriptCopy(controller, copyServices)
  const copyLink = useSessionLinkCopy(
    controller.target,
    links.origin,
    copyServices,
  )
  const copyCode = useCodeCopyAction(copyServices)
  const [ownSplit] = useState(() => new PaneSplit(null))
  useMentionCopy()
  useReport(snapshot.workspace, props.onWorkspaceChange)
  useReport(snapshot.view, props.onViewChange)
  useFollowTabs(
    controller.places,
    snapshot.load.state === 'ready'
      ? sessions.map((session) => session.id)
      : null,
  )
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
  const keyRow = phone
    ? phone.tabs
    : (plans.find((plan) => plan.index === focused) ?? plans[0]).tabs
  const sessionId =
    shownSessionId(snapshot) ?? shownSessionId(snapshot, focused === 0 ? 1 : 0)
  useTabKeys({ tabs: keyRow, controller, history, copy, sessionId })
  const row: RowProps = {
    historyEntries: history,
    historyOpen: overlay.kind === 'history',
    mobile,
    onCancelRename: controller.dismissOverlay,
    onClose: controller.requestClose,
    onCloseTabs: (closed) =>
      controller.updateView((view) => withoutTabs(view, closed)),
    onCopy: copy,
    onCopyLink: copyLink,
    onMove: controller.moveTab,
    onRename: (id, title) => void controller.rename(id, title),
    onSelect: controller.select,
    onShowHistory: controller.showHistory,
    onStartRename: controller.startRename,
    readOnly,
    renaming: overlay.kind === 'rename' ? overlay.sessionId : null,
  }
  const chat: ChatProps = {
    controller,
    snapshot,
    host: props.host,
    mobile,
    now,
    onConnectAgent: props.onConnectAgent,
    onOpenDiff: props.onOpenDiff,
    readOnly,
  }
  const overlays = (
    <ChatOverlays
      history={history}
      mobile={mobile}
      onConfirmClose={controller.confirmClose}
      onDismiss={controller.dismissOverlay}
      overlay={overlay}
      sessions={snapshot.sessions}
    />
  )
  // Two panes share one bar of the sandbox, below both, while a chat shows.
  const bar = sandboxParts(chat).sandboxBar
  const barBelow = plans.length > 1 && bar !== null && chats.length > 0
  const column = phone ? (
    <PhoneChat
      chat={chat}
      composerFocus={props.composerFocus}
      copyCode={copyCode}
      onNew={() => void controller.newSession()}
      row={row}
      sessionId={phone.sessionId}
      tabs={phone.tabs}
    >
      {overlays}
    </PhoneChat>
  ) : (
    <ChatPanes
      barBelow={barBelow}
      chat={chat}
      composerFocus={props.composerFocus}
      copyCode={copyCode}
      focused={focused}
      footer={barBelow ? bar : null}
      lead={leadPane(plans, focused)}
      onFocus={controller.focusPane}
      onNew={(pane) => void controller.newSession(pane)}
      plans={plans}
      row={row}
      split={props.paneSplit ?? ownSplit}
    >
      {overlays}
    </ChatPanes>
  )
  return (
    <LinksProvider value={links}>
      <MentionsProvider
        root={snapshot.repositoryFolder}
        value={props.mentions ?? null}
      >
        {column}
      </MentionsProvider>
    </LinksProvider>
  )
}
