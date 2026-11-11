import { Fragment, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { UserMessage } from '../../shared/messages'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { formatDuration } from '../../shared/transcript/duration'
import { retryItemId } from '../../shared/transcript/known-turns'
import type {
  RunningTurn,
  Transcript,
} from '../../shared/transcript/transcript'
import { ToolGroup } from './ToolGroup'
import { ItemView, UserBubble } from './TranscriptItem'
import { turnCopy, type ChatReaders } from '../../shared/transcript/turn-words'
import {
  groupEntries,
  type TranscriptInsert,
} from '../../shared/transcript/transcript-entries'
import { WorkFold } from './WorkFold'

/** The running turn: thinking until the agent writes, and the time since it started. */
function WorkingRow(props: { turn: RunningTurn; now: number }) {
  const theme = useSharedUiTheme()
  return (
    <div className={styles.working}>
      <Spinner color={theme.colors.primary} size={12} />
      {props.turn.thinking ? turnCopy.thinking : turnCopy.working}
      <span className={styles.elapsed}>
        {formatDuration(props.now - props.turn.startedAt)}
      </span>
    </div>
  )
}

/**
 * The parts of a session's chat in order: messages, answers, folded tool
 * calls, the folded work of each ended turn, the end of each turn, and the
 * line of each lost event. Sent messages that the stream has not shown yet
 * follow, then the running turn, then `children`, such as the steps of a
 * sandbox start.
 */
export function TranscriptView(props: {
  transcript: Transcript
  inserts?: readonly TranscriptInsert<ReactNode>[]
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
  // The newest session record gives the permission. The order of the items
  // gives none. A read-only chat offers no Try again.
  const retryable = props.readOnly ? null : retryItemId(transcript)
  return (
    <>
      {groupEntries(transcript, props.inserts ?? []).map((entry) => {
        switch (entry.kind) {
          case 'insert':
            return (
              <Fragment key={entry.insert.key}>{entry.insert.content}</Fragment>
            )
          case 'tools':
            return (
              <ToolGroup
                calls={entry.calls}
                growing={entry.growing}
                key={entry.id}
              />
            )
          case 'work':
            return <WorkFold key={entry.id} steps={entry.steps} />
          case 'item':
            return (
              <ItemView
                actions={{
                  canRetry: entry.item.id === retryable,
                  retrying: props.retrying,
                  onRetry: props.onRetry,
                  onOpenDiff: props.onOpenDiff,
                }}
                item={entry.item}
                key={entry.item.id}
                readers={props.readers}
                transcript={transcript}
              />
            )
        }
      })}
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
