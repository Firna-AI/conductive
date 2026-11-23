import { memo, useContext, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { ToolCall } from '../../shared/generated/ToolCall'
import styles from '../../ui/components/chat/ChatItemView.module.css'
import { formatDuration } from '../../shared/transcript/duration'
import type { WorkStep } from '../../shared/transcript/transcript-entries'
import { turnCopy, type ChatReaders } from '../../shared/transcript/turn-words'
import type { PendingMessage } from '../state/chat-snapshot'
import { ChatClock, useNow } from '../ui/clock'
import { rowKeyAttribute } from './chat-place'
import local from './chat.module.css'
import { sameData } from './same-data'
import { ToolGroup } from './ToolGroup'
import {
  ItemView,
  StoppedLine,
  UserBubble,
  type ItemActions,
  type PlainItem,
} from './TranscriptItem'
import { TurnEnd } from './TurnEnd'
import type {
  EndFacts,
  StopFacts,
  StoppedItem,
  TurnEndItem,
} from './turn-facts'
import { WorkFold } from './WorkFold'

// Each row of the transcript draws again only when its own data changes, as
// `sameData` says. So a streamed part draws only the row that it changes,
// and a tick of the clock draws only the time of the running turn.

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

/** A part that the chat adds among the items, such as a Mac command. */
export const InsertRow = memo(function InsertRow(props: {
  id: string
  content: ReactNode
}) {
  return <Row id={`insert:${props.id}`}>{props.content}</Row>
}, sameData)

/** A run of tool calls, which folds. */
export const ToolsRow = memo(function ToolsRow(props: {
  id: string
  calls: readonly ToolCall[]
  open: boolean
}) {
  return (
    <Row id={`tools:${props.id}`}>
      <ToolGroup calls={props.calls} open={props.open} />
    </Row>
  )
}, sameData)

/** The folded work of an ended turn. */
export const WorkRow = memo(function WorkRow(props: {
  id: string
  steps: readonly WorkStep<ReactNode>[]
}) {
  return (
    <Row id={`work:${props.id}`}>
      <WorkFold steps={props.steps} />
    </Row>
  )
}, sameData)

/**
 * A message, an answer, a failure, a lost event, or a note. `live` marks
 * the agent message that the agent writes now.
 */
export const ItemRow = memo(function ItemRow(props: {
  item: PlainItem
  actions: ItemActions
  readers: ChatReaders
  live?: boolean
}) {
  return (
    <Row id={`item:${props.item.id}`}>
      <ItemView
        actions={props.actions}
        item={props.item}
        live={props.live}
        readers={props.readers}
      />
    </Row>
  )
}, sameData)

/** The end of a finished turn: its duration and the files that it changed. */
export const TurnEndRow = memo(function TurnEndRow(props: {
  item: TurnEndItem
  facts: EndFacts
  onOpenDiff?: (path: string) => void
}) {
  const { item, facts } = props
  return (
    <Row id={`item:${item.id}`}>
      <TurnEnd
        durationMs={item.durationMs}
        endReason={facts.endReason}
        files={item.files}
        filesUnavailable={facts.filesUnavailable}
        omittedFiles={facts.omittedFiles}
        onOpenDiff={props.onOpenDiff}
        standardSpeed={facts.standardSpeed}
      />
    </Row>
  )
}, sameData)

/** The line of a stopped turn. */
export const StopRow = memo(function StopRow(props: {
  item: StoppedItem
  facts: StopFacts
}) {
  return (
    <Row id={`item:${props.item.id}`}>
      <StoppedLine facts={props.facts} />
    </Row>
  )
}, sameData)

/** A message that the stream has not shown yet, also while its send waits. */
export const PendingRow = memo(function PendingRow(props: {
  message: PendingMessage
}) {
  return (
    <Row id={`pending:${props.message.id}`}>
      <UserBubble message={props.message} />
    </Row>
  )
}, sameData)

/**
 * The running turn: thinking until the agent writes, and the time since it
 * started. The row keeps its own tick from the clock of the chat while it
 * shows, so the time moves on in each chat that shows the turn, such as the
 * popover of an explanation over an idle session.
 */
export const WorkingRow = memo(function WorkingRow(props: {
  thinking: boolean
  startedAt: number
}) {
  const theme = useSharedUiTheme()
  const now = useNow(useContext(ChatClock), true)
  return (
    <Row id="working">
      <div className={styles.working}>
        <Spinner color={theme.colors.primary} size={12} />
        {props.thinking ? turnCopy.thinking : turnCopy.working}
        <span className={styles.elapsed}>
          {formatDuration(now - props.startedAt)}
        </span>
      </div>
    </Row>
  )
})
