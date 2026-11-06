import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, CircleStop, Clock } from 'lucide-react'
import type { ToolCall } from '../../shared/chat-events'
import type { UserMessage } from '../../shared/messages'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { InlineText } from '../../../docs/mockups/src/components/common/InlineText'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { formatDuration } from '../state/format'
import type {
  RunningTurn,
  Transcript,
  TranscriptItem,
} from '../state/transcript'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { AgentText } from './AgentText'
import { SentFiles } from './AttachmentChips'
import { ToolGroup } from './ToolGroup'
import { TurnEnd } from './TurnEnd'

type Entry =
  | { kind: 'item'; item: TranscriptItem }
  | { kind: 'tools'; id: string; calls: ToolCall[] }

/** Groups each run of consecutive tool calls, so the chat can fold it. */
function groupEntries(items: readonly TranscriptItem[]): Entry[] {
  const entries: Entry[] = []
  for (const item of items) {
    const last = entries.at(-1)
    if (item.kind !== 'tool') entries.push({ kind: 'item', item })
    else if (last?.kind === 'tools') last.calls.push(item.tool)
    else entries.push({ kind: 'tools', id: item.id, calls: [item.tool] })
  }
  return entries
}

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

/** The running turn: thinking until the agent writes, and the time since it started. */
function WorkingRow(props: { turn: RunningTurn; now: number }) {
  const theme = useSharedUiTheme()
  return (
    <div className={styles.working}>
      <Spinner color={theme.colors.primary} size={12} />
      {props.turn.thinking ? 'Thinking' : 'Working'}
      <span className={styles.elapsed}>
        {formatDuration(props.now - props.turn.startedAt)}
      </span>
    </div>
  )
}

interface ItemActions {
  /** Try again shows on a failed turn that is the last part of the chat. */
  canRetry: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
}

function ItemView(props: { item: TranscriptItem; actions: ItemActions }) {
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
          onOpenDiff={actions.onOpenDiff}
        />
      )
    case 'stopped':
      return (
        <div className={styles.event}>
          <CircleStop size={13} />
          You stopped the agent
        </div>
      )
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
  }
}

/**
 * The parts of a session's chat in order: messages, answers, folded tool
 * calls, and the end of each turn. Sent messages that the stream has not
 * shown yet follow, then the running turn, then `children`, such as the
 * steps of a sandbox start.
 */
export function TranscriptView(props: {
  transcript: Transcript
  pending: readonly UserMessage[]
  now: number
  readOnly: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
  children?: ReactNode
}) {
  const { transcript } = props
  const last = transcript.items.at(-1)
  return (
    <>
      {groupEntries(transcript.items).map((entry) =>
        entry.kind === 'tools' ? (
          <ToolGroup calls={entry.calls} key={entry.id} />
        ) : (
          <ItemView
            actions={{
              canRetry:
                !props.readOnly && !transcript.turn && entry.item === last,
              retrying: props.retrying,
              onRetry: props.onRetry,
              onOpenDiff: props.onOpenDiff,
            }}
            item={entry.item}
            key={entry.item.id}
          />
        ),
      )}
      {props.pending.map((message) => (
        <UserBubble key={`pending:${message.id}`} message={message} />
      ))}
      {transcript.turn ? (
        <WorkingRow now={props.now} turn={transcript.turn} />
      ) : null}
      {props.children}
    </>
  )
}
