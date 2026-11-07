import { Fragment, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { UserMessage } from '../../shared/messages'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { formatDuration } from '../state/format'
import { newestTurnId } from '../state/known-turns'
import type { RunningTurn, Transcript } from '../state/transcript'
import { ToolGroup } from './ToolGroup'
import { ItemView, UserBubble, type ChatReaders } from './TranscriptItem'

import { groupEntries, type TranscriptInsert } from './transcript-entries'

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
  inserts?: readonly TranscriptInsert[]
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
  // Try again shows on the failed item of the newest turn, when no turn runs
  // and no later event added an item other than a lost line or a late item of
  // an ended turn. A message sent after the failure hides it.
  const latest = transcript.items.find(
    (item) => item.id === transcript.latestItemId,
  )
  const retryable =
    !props.readOnly &&
    !transcript.turn &&
    latest?.kind === 'failed' &&
    latest.turnId === newestTurnId(transcript)
      ? latest
      : null
  return (
    <>
      {groupEntries(transcript.items, props.inserts ?? []).map((entry) =>
        entry.kind === 'insert' ? (
          <Fragment key={entry.insert.key}>{entry.insert.node}</Fragment>
        ) : entry.kind === 'tools' ? (
          <ToolGroup calls={entry.calls} key={entry.id} />
        ) : (
          <ItemView
            actions={{
              canRetry: entry.item === retryable,
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
