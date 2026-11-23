import { memo, type ReactNode } from 'react'
import type { PendingMessage } from '../state/chat-snapshot'
import { retryItemId } from '../../shared/transcript/known-turns'
import type { Transcript } from '../../shared/transcript/transcript'
import {
  groupEntries,
  type Entry,
  type SingleItem,
  type TranscriptInsert,
} from '../../shared/transcript/transcript-entries'
import type { ChatReaders } from '../../shared/transcript/turn-words'
import {
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
  readOnly: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
  /** The ID of a member message that the rows leave out, as `hide` says. */
  hide: string | null
}

/**
 * The ID of the agent message that the agent writes now: the newest item of
 * the running turn, when it is an agent message that `assistant.completed`
 * has not completed. A later step of the turn or the end of the turn also
 * shows that the message is complete.
 */
function writingMessage(transcript: Transcript): string | null {
  const running = transcript.turn?.turnId
  if (running === undefined) return null
  const newest = transcript.items.findLast(
    (item) => 'turnId' in item && item.turnId === running,
  )
  return newest?.kind === 'agent' && !newest.complete ? newest.id : null
}

/** The items of the rows that the transcript marks. */
interface MarkedItems {
  /** The item that may offer Try again. */
  retryable: string | null
  /** The agent message that the agent writes now. */
  writing: string | null
}

/**
 * The row of an item. The end of a turn and the line of a stopped turn get
 * the data that the transcript keeps about their turn, so the row needs no
 * other part of the transcript. The agent message that the agent writes now
 * closes its open marks, as "While the agent writes" of `chat-markdown.md`
 * says.
 */
function itemRow(item: SingleItem, props: RowsProps, marked: MarkedItems) {
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
    default: {
      // Only the item that may offer Try again shows a retry that runs.
      const canRetry = item.id === marked.retryable
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
          live={item.id === marked.writing}
          readers={props.readers}
        />
      )
    }
  }
}

/** Whether an entry is the member message with the ID `hide`. */
function hides(entry: Entry<ReactNode>, hide: string | null): boolean {
  return (
    entry.kind === 'item' &&
    entry.item.kind === 'user' &&
    entry.item.message.id === hide
  )
}

/**
 * The rows of the items, in the order of `groupEntries`. Each row draws
 * again only when its own data changes. A tick of the clock changes no
 * input here, so it draws none of them.
 */
const TranscriptRows = memo(function TranscriptRows(props: RowsProps) {
  const { transcript, hide } = props
  // The newest session record gives the permission. The order of the items
  // gives none. A read-only chat offers no Try again.
  const retryable = props.readOnly ? null : retryItemId(transcript)
  const marked = { retryable, writing: writingMessage(transcript) }
  const entries = groupEntries(transcript, props.inserts).filter(
    (entry) => !hides(entry, hide),
  )
  return entries.map((entry) => {
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
        return itemRow(entry.item, props, marked)
    }
  })
})

/**
 * The parts of a session's chat in order: messages, answers, folded tool
 * calls, the folded work of each ended turn, the end of each turn, and the
 * line of each lost event. Messages that the stream has not shown yet
 * follow, also while their send waits, then the running turn, then `children`, such as the steps of a
 * sandbox start. The agent message that the agent writes now closes its
 * open marks, as "While the agent writes" of `chat-markdown.md` says. Give
 * stable `inserts`, `readers`, `onRetry`, and `onOpenDiff`: a new value
 * draws each row that uses it again.
 */
export function TranscriptView(props: {
  transcript: Transcript
  inserts?: readonly TranscriptInsert<ReactNode>[]
  readers: ChatReaders
  pending: readonly PendingMessage[]
  readOnly: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
  onOpenDiff?: (path: string) => void
  /**
   * The ID of a message that the chat leaves out, such as the written
   * prompt of an explanation in its popover. It still starts its turn, so
   * the work of that turn folds.
   */
  hide?: string | null
  children?: ReactNode
}) {
  const { turn } = props.transcript
  const hide = props.hide ?? null
  return (
    <>
      <TranscriptRows
        hide={hide}
        inserts={props.inserts ?? noInserts}
        onOpenDiff={props.onOpenDiff}
        onRetry={props.onRetry}
        readers={props.readers}
        readOnly={props.readOnly}
        retrying={props.retrying}
        transcript={props.transcript}
      />
      {props.pending
        .filter((message) => message.id !== hide)
        .map((message) => (
          <PendingRow key={`pending:${message.id}`} message={message} />
        ))}
      {turn ? (
        <WorkingRow startedAt={turn.startedAt} thinking={turn.thinking} />
      ) : null}
      {props.children}
    </>
  )
}
