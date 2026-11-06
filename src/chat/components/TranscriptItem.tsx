import { CircleAlert, CircleStop, Clock } from 'lucide-react'
import type { UserMessage } from '../../shared/messages'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { InlineText } from '../../../docs/mockups/src/components/common/InlineText'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { unlistedFiles } from '../../../docs/mockups/src/components/chat/lostCopy'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import type { MemberSummary } from '../api/read-responses'
import type { Transcript, TranscriptItem } from '../state/transcript'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { AgentText } from './AgentText'
import { SentFiles } from './AttachmentChips'
import { LostEventLine } from './LostEventLine'
import { ToolGroup } from './ToolGroup'
import { TurnEnd } from './TurnEnd'

/** A message that a person sent, and whether it waits for the sandbox. */
export function UserBubble(props: { message: UserMessage }) {
  const { message } = props
  return (
    <div className={styles.user}>
      <div className={classes(styles.bubble, controls.lines)}>
        <InlineText text={message.text} />
      </div>
      {message.attachments.length > 0 ? (
        <SentFiles attachments={message.attachments} />
      ) : null}
      {message.state === 'queued' ? (
        <span className={styles.queued}>
          <Clock size={12} />
          Sends when the sandbox is ready
        </span>
      ) : null}
    </div>
  )
}

/** The person who reads the chat, and the members whom it can name. */
export interface ChatReaders {
  viewerId: string | null
  members: readonly MemberSummary[]
}

/**
 * The line of a stopped turn (decision 72): "You" to the member who pressed
 * Stop, and that member's name to the others. A stop without a request, or
 * by a member whom the chat cannot name, names nobody.
 */
function stoppedLine(by: string | null, readers: ChatReaders): string {
  if (by !== null && by === readers.viewerId) return 'You stopped the agent'
  const member = readers.members.find((item) => item.id === by)
  if (!member) return 'The agent stopped'
  return `${member.displayName ?? member.githubLogin} stopped the agent`
}

/** The files of an ended turn past the ones that the runner listed. */
function omittedFiles(transcript: Transcript, turnId: string): number {
  const { turnCompletions } = transcript
  return Object.hasOwn(turnCompletions, turnId)
    ? turnCompletions[turnId].omittedFileCount
    : 0
}

export interface ItemActions {
  /** Try again shows on a failed turn that is the last part of the chat. */
  canRetry: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
}

/** One part of a session's chat, other than a run of tool calls. */
export function ItemView(props: {
  item: TranscriptItem
  transcript: Transcript
  actions: ItemActions
  readers: ChatReaders
}) {
  const { item, actions } = props
  switch (item.kind) {
    case 'user':
      return <UserBubble message={item.message} />
    case 'agent':
      return <AgentText text={item.text} />
    case 'tool':
      return <ToolGroup calls={[item.tool]} />
    case 'turn-end':
      return (
        <TurnEnd
          durationMs={item.durationMs}
          files={item.files}
          omittedFiles={omittedFiles(props.transcript, item.turnId)}
          onOpenDiff={actions.onOpenDiff}
        />
      )
    case 'stopped': {
      const files = omittedFiles(props.transcript, item.turnId)
      return (
        <div className={styles.event}>
          <CircleStop size={13} />
          {stoppedLine(item.by, props.readers)}
          {files > 0 ? ` · ${unlistedFiles(files)}` : null}
        </div>
      )
    }
    case 'failed':
      return (
        <Notice
          action={
            actions.canRetry ? (
              <ActionButton
                busy={actions.retrying}
                onPress={() => actions.onRetry(item.retryMessageId)}
              >
                Try again
              </ActionButton>
            ) : undefined
          }
          body={item.error.message}
          icon={CircleAlert}
          title="This turn stopped"
          tone="danger"
        />
      )
    case 'lost':
      return <LostEventLine marker={item.marker} />
  }
}
