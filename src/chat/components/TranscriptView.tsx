import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { ToolCall } from '../../shared/chat-events'
import type { UserMessage } from '../../shared/messages'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { formatDuration } from '../state/format'
import type {
  RunningTurn,
  Transcript,
  TranscriptItem,
} from '../state/transcript'
import { ToolGroup } from './ToolGroup'
import { ItemView, UserBubble, type ChatReaders } from './TranscriptItem'

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

/**
 * The parts of a session's chat in order: messages, answers, folded tool
 * calls, the end of each turn, and the line of each lost event. Sent
 * messages that the stream has not shown yet follow, then the running turn,
 * then `children`, such as the steps of a sandbox start.
 */
export function TranscriptView(props: {
  transcript: Transcript
  readers: ChatReaders
  pending: readonly UserMessage[]
  now: number
  readOnly: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
  children?: ReactNode
}) {
  const { transcript } = props
  // The line of a lost event keeps Try again on the failed turn above it.
  const last = transcript.items.findLast((item) => item.kind !== 'lost')
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
            readers={props.readers}
            transcript={transcript}
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
