import type { Session } from '../../shared/generated/Session'
import { RotateCcw, Square } from 'lucide-react'

import { nameLabel } from '../../shared/name-label'
import { endedAt, historySessions } from '../state/archive-view'
import type { ChatSnapshot, Overlay } from '../state/chat-snapshot'
import { formatAgo } from '../state/format'
import { ActionButton } from '../ui/actions'
import { Menu, type MenuEntry } from '../ui/Menu'
import { ConfirmDialog, DialogText, Sheet } from '../ui/overlays'
import { AgentMark } from './AgentMark'

/**
 * The sessions whose tabs the user closed, the last closed first: the mark
 * of the agent, the title, and the time since it closed. Each one reopens.
 * `endedAt` gives the time that a session ended, by default its close.
 * `closedFirst` lists the sessions whose last close has no stored time, the
 * last closed first, such as tabs that closed in the browser only. They lead
 * the list, and each row still shows the time of `endedAt`.
 */
export function historyEntries(
  history: readonly Session[],
  now: number,
  onReopen: (sessionId: string) => void,
  endedAt: (session: Session) => number | null = (session) => session.closedAt,
  closedFirst: readonly string[] = [],
): MenuEntry[] {
  if (history.length === 0) {
    return [{ kind: 'note', text: 'Sessions that you close show here.' }]
  }
  const ended = (session: Session) => endedAt(session) ?? now
  const rank = (session: Session) => {
    const index = closedFirst.indexOf(session.id)
    return index < 0 ? closedFirst.length : index
  }
  return [...history]
    .sort(
      (left, right) => rank(left) - rank(right) || ended(right) - ended(left),
    )
    .map((session) => ({
      kind: 'item',
      key: session.id,
      label: nameLabel(session.title),
      mark: <AgentMark agent={session.choice.agent} />,
      detail: formatAgo(ended(session), now),
      trailingIcon: RotateCcw,
      onSelect: () => onReopen(session.id),
    }))
}

/**
 * The session history of the chat, as its menu and Reopen closed session
 * read it: the sessions of `historySessions` with the times of `endedAt`.
 * A read-only chat lists first the sessions whose tabs closed in the
 * browser only, the last closed first, as `archive-view.ts` says. A chat
 * that takes writes keeps the stored close order, also for the closes of
 * other members. `readOnly` is true for an archived workspace, and for one
 * that the host shows read-only.
 */
export function chatHistory(
  snapshot: ChatSnapshot,
  readOnly: boolean,
  now: number,
  onReopen: (sessionId: string) => void,
): MenuEntry[] {
  return historyEntries(
    historySessions(snapshot, readOnly),
    now,
    onReopen,
    (session) => endedAt(snapshot, session),
    readOnly ? snapshot.archiveClosed : [],
  )
}

/** The names of sessions in a sentence, such as "A, B, and C". */
function namesOf(names: readonly string[]): string {
  if (names.length <= 2) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/**
 * The question before the tabs of running sessions close. It names each
 * session as its tab does. One running session keeps the singular words.
 */
function CloseQuestion(props: {
  sessionIds: readonly string[]
  sessions: readonly Session[]
  mobile: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const titles = props.sessionIds.map((id) => {
    const session = props.sessions.find((item) => item.id === id)
    return session ? nameLabel(session.title) : 'this session'
  })
  const many = titles.length > 1
  return (
    <ConfirmDialog
      actions={
        <>
          <ActionButton onPress={props.onCancel}>Cancel</ActionButton>
          <ActionButton icon={Square} onPress={props.onConfirm} tone="primary">
            Stop and close
          </ActionButton>
        </>
      }
      mobile={props.mobile}
      onCancel={props.onCancel}
      title={
        many
          ? 'Stop the turns and close the tabs?'
          : 'Stop the turn and close the tab?'
      }
    >
      <DialogText>
        {many
          ? `The agents are working in ${namesOf(titles)}. The sessions move to the session history, where you can reopen them.`
          : `The agent is working in ${titles[0]}. The session moves to the session history, where you can reopen it.`}
      </DialogText>
    </ConfirmDialog>
  )
}

/**
 * What lies open over the chat: the question before a running session
 * closes, which names the session as its tab does, and on a phone the
 * session history as a sheet. Desktop draws the history beside its clock.
 */
export function ChatOverlays(props: {
  overlay: Overlay
  mobile: boolean
  sessions: readonly Session[]
  history: readonly MenuEntry[]
  onDismiss: () => void
  onConfirmClose: () => void
}) {
  const { overlay } = props
  if (overlay.kind === 'close') {
    return (
      <CloseQuestion
        mobile={props.mobile}
        onCancel={props.onDismiss}
        onConfirm={props.onConfirmClose}
        sessionIds={overlay.sessionIds}
        sessions={props.sessions}
      />
    )
  }
  if (overlay.kind === 'history' && props.mobile) {
    return (
      <Sheet onClose={props.onDismiss} title="Session history">
        <Menu
          entries={props.history}
          label="Session history"
          onClose={props.onDismiss}
          placement="sheet"
        />
      </Sheet>
    )
  }
  return null
}
