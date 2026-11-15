import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { PendingMessage } from '../state/chat-snapshot'
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
import { rowKeyAttribute } from './chat-place'
import local from './chat.module.css'

/**
 * One row of the transcript, with the key that the reader's place keeps. A
 * row lays out its parts as the transcript does, and an empty row takes no
 * space, so the rows change nothing that shows.
 */
function Row(props: { id: string; children: ReactNode }) {
  const key = { [rowKeyAttribute]: props.id }
  return (
    <div className={local.row} {...key}>
      {props.children}
    </div>
  )
}

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
 * line of each lost event. Messages that the stream has not shown yet
 * follow, also while their send waits, then the running turn, then `children`, such as the steps of a
 * sandbox start.
 */
export function TranscriptView(props: {
  transcript: Transcript
  inserts?: readonly TranscriptInsert<ReactNode>[]
  readers: ChatReaders
  pending: readonly PendingMessage[]
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
              <Row id={`insert:${entry.insert.key}`} key={entry.insert.key}>
                {entry.insert.content}
              </Row>
            )
          case 'tools':
            return (
              <Row id={`tools:${entry.id}`} key={entry.id}>
                <ToolGroup calls={entry.calls} open={entry.open} />
              </Row>
            )
          case 'work':
            return (
              <Row id={`work:${entry.id}`} key={entry.id}>
                <WorkFold steps={entry.steps} />
              </Row>
            )
          case 'item':
            return (
              <Row id={`item:${entry.item.id}`} key={entry.item.id}>
                <ItemView
                  actions={{
                    canRetry: entry.item.id === retryable,
                    retrying: props.retrying,
                    onRetry: props.onRetry,
                    onOpenDiff: props.onOpenDiff,
                  }}
                  item={entry.item}
                  readers={props.readers}
                  transcript={transcript}
                />
              </Row>
            )
        }
      })}
      {props.pending.map((message) => (
        <Row id={`pending:${message.id}`} key={`pending:${message.id}`}>
          <UserBubble message={message} />
        </Row>
      ))}
      {transcript.turn ? (
        <Row id="working">
          <WorkingRow now={props.now} turn={transcript.turn} />
        </Row>
      ) : null}
      {props.children}
    </>
  )
}
