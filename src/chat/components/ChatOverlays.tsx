import { RotateCcw, Square } from 'lucide-react'
import type { Session } from '../../shared/sessions'
import type { Overlay } from '../state/chat-snapshot'
import { formatAgo } from '../state/format'
import { sortHistory } from '../state/sessions'
import { ActionButton } from '../ui/actions'
import { Menu, type MenuEntry } from '../ui/Menu'
import { ConfirmDialog, DialogText, Sheet } from '../ui/overlays'
import { AgentMark } from './AgentMark'

/**
 * The sessions whose tabs the user closed, the last closed first: the mark
 * of the agent, the title, and the time since it closed. Each one reopens.
 */
export function historyEntries(
  history: readonly Session[],
  now: number,
  onReopen: (sessionId: string) => void,
): MenuEntry[] {
  if (history.length === 0) {
    return [{ kind: 'note', text: 'Sessions that you close show here.' }]
  }
  return sortHistory(history).map((session) => ({
    kind: 'item',
    key: session.id,
    label: session.title,
    mark: <AgentMark agent={session.choice.agent} />,
    detail: formatAgo(session.closedAt ?? now, now),
    trailingIcon: RotateCcw,
    onSelect: () => onReopen(session.id),
  }))
}

/**
 * What lies open over the chat: the question before a running session
 * closes, and on a phone the session history as a sheet. Desktop draws the
 * history beside its clock.
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
    const title =
      props.sessions.find((item) => item.id === overlay.sessionId)?.title ??
      'this session'
    return (
      <ConfirmDialog
        actions={
          <>
            <ActionButton onPress={props.onDismiss}>Cancel</ActionButton>
            <ActionButton
              icon={Square}
              onPress={props.onConfirmClose}
              tone="primary"
            >
              Stop and close
            </ActionButton>
          </>
        }
        mobile={props.mobile}
        onCancel={props.onDismiss}
        title="Stop the turn and close the tab?"
      >
        <DialogText>
          The agent is working in {title}. The session moves to the session
          history, where you can reopen it.
        </DialogText>
      </ConfirmDialog>
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
