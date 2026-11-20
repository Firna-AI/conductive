import { memo, type ReactNode } from 'react'
import type { PendingMessage } from '../state/chat-snapshot'
import { retryItemId } from '../../shared/transcript/known-turns'
import type { RecoveryLogin } from '../../shared/transcript/recovery-login'
import type { Transcript } from '../../shared/transcript/transcript'
import {
  groupEntries,
  type SingleItem,
  type TranscriptInsert,
} from '../../shared/transcript/transcript-entries'
import { continuationNext } from '../../shared/transcript/turn-continued'
import type { ChatReaders } from '../../shared/transcript/turn-words'
import {
  ContinuationRow,
  InsertRow,
  ItemRow,
  PendingRow,
  StopRow,
  ToolsRow,
  TurnEndRow,
  WorkingRow,
  WorkRow,
} from './transcript-rows'
import { endFacts, stopFacts } from './turn-facts'

const noInserts: readonly TranscriptInsert<ReactNode>[] = []

interface RowsProps {
  transcript: Transcript
  inserts: readonly TranscriptInsert<ReactNode>[]
  readers: ChatReaders
  /** The login that the session keeps, or null while the chat lacks it. */
  recovery: RecoveryLogin | null
  readOnly: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
}

/**
 * The row of an item. The end of a turn and the line of a stopped turn get
 * the data that the transcript keeps about their turn, so the row needs no
 * other part of the transcript. The line after a provider stop gets its
 * words, which name the login of the session when that login is gone.
 */
function itemRow(item: SingleItem, props: RowsProps, retryable: string | null) {
  switch (item.kind) {
    case 'turn-end':
      return (
        <TurnEndRow
          facts={endFacts(props.transcript, item)}
          item={item}
          key={item.id}
          onOpenDiff={props.onOpenDiff}
        />
      )
    case 'stopped':
      return (
        <StopRow
          facts={stopFacts(props.transcript, item, props.readers)}
          item={item}
          key={item.id}
        />
      )
    case 'turn-continued':
      return (
        <ContinuationRow
          id={item.id}
          key={item.id}
          next={continuationNext(item, props.recovery)}
        />
      )
    default: {
      // Only the item that may offer Try again shows a retry that runs.
      const canRetry = item.id === retryable
      const actions = {
        canRetry,
        retrying: canRetry && props.retrying,
        onRetry: props.onRetry,
      }
      return (
        <ItemRow
          actions={actions}
          item={item}
          key={item.id}
          readers={props.readers}
        />
      )
    }
  }
}

/**
 * The rows of the items, in the order of `groupEntries`. Each row draws
 * again only when its own data changes. A tick of the clock changes no
 * input here, so it draws none of them.
 */
const TranscriptRows = memo(function TranscriptRows(props: RowsProps) {
  const { transcript } = props
  // The newest session record gives the permission. The order of the items
  // gives none. A read-only chat offers no Try again.
  const retryable = props.readOnly ? null : retryItemId(transcript)
  return groupEntries(transcript, props.inserts).map((entry) => {
    switch (entry.kind) {
      case 'insert':
        return (
          <InsertRow
            content={entry.insert.content}
            id={entry.insert.key}
            key={entry.insert.key}
          />
        )
      case 'tools':
        return (
          <ToolsRow
            calls={entry.calls}
            id={entry.id}
            key={entry.id}
            open={entry.open}
          />
        )
      case 'work':
        return <WorkRow id={entry.id} key={entry.id} steps={entry.steps} />
      case 'item':
        return itemRow(entry.item, props, retryable)
    }
  })
})

/**
 * The parts of a session's chat in order: messages, answers, folded tool
 * calls, the folded work of each ended turn, the end of each turn, and the
 * line of each lost event. Messages that the stream has not shown yet
 * follow, also while their send waits, then the running turn, then `children`, such as the steps of a
 * sandbox start. Give stable `inserts`, `readers`, `recovery`, `onRetry`,
 * and `onOpenDiff`: a new value draws each row that uses it again.
 */
export function TranscriptView(props: {
  transcript: Transcript
  inserts?: readonly TranscriptInsert<ReactNode>[]
  readers: ChatReaders
  recovery: RecoveryLogin | null
  pending: readonly PendingMessage[]
  now: number
  readOnly: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
  children?: ReactNode
}) {
  const { turn } = props.transcript
  return (
    <>
      <TranscriptRows
        inserts={props.inserts ?? noInserts}
        onOpenDiff={props.onOpenDiff}
        onRetry={props.onRetry}
        readers={props.readers}
        readOnly={props.readOnly}
        recovery={props.recovery}
        retrying={props.retrying}
        transcript={props.transcript}
      />
      {props.pending.map((message) => (
        <PendingRow key={`pending:${message.id}`} message={message} />
      ))}
      {turn ? (
        <WorkingRow
          now={props.now}
          startedAt={turn.startedAt}
          thinking={turn.thinking}
        />
      ) : null}
      {props.children}
    </>
  )
}
