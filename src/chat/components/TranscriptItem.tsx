import { CircleAlert, CircleStop } from 'lucide-react'
import type { UserMessage } from '../../shared/messages'
import { ContinuedLine } from '../../../docs/mockups/src/components/chat/ContinuedLine'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { LinkedText } from '../links/LinkedText'
import type {
  Transcript,
  TranscriptItem,
} from '../../shared/transcript/transcript'
import {
  continuedBy,
  filesUnread,
  omittedFiles,
  stoppedSummary,
  turnCopy,
  type ChatReaders,
} from '../../shared/transcript/turn-words'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { AgentText } from './AgentText'
import { SentFiles } from './AttachmentChips'
import { LostEventLine } from './LostEventLine'
import { ToolGroup } from './ToolGroup'
import { TurnEnd } from './TurnEnd'

/**
 * A message that a person sent. Each part in backticks is code, and each
 * workspace link is a chip.
 */
export function UserBubble(props: { message: UserMessage }) {
  const { message } = props
  return (
    <div className={styles.user}>
      <div className={classes(styles.bubble, controls.lines)}>
        <LinkedText mentions text={message.text} />
      </div>
      {message.attachments.length > 0 ? (
        <SentFiles attachments={message.attachments} />
      ) : null}
    </div>
  )
}

export interface ItemActions {
  /** Whether this failed item may offer Try again. */
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
          // Files that a row lists stay true, also after a later end.
          filesUnavailable={
            item.files.length === 0 &&
            filesUnread(props.transcript, item.turnId)
          }
          omittedFiles={omittedFiles(props.transcript, item.turnId)}
          onOpenDiff={actions.onOpenDiff}
        />
      )
    case 'stopped':
      return (
        <div className={styles.event}>
          <CircleStop size={13} />
          {stoppedSummary(
            props.transcript,
            item.turnId,
            item.by,
            props.readers,
          )}
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
                {turnCopy.retry}
              </ActionButton>
            ) : undefined
          }
          body={item.error.message}
          icon={CircleAlert}
          title={turnCopy.failed}
          tone="danger"
        />
      )
    case 'lost':
      return <LostEventLine marker={item.marker} />
    case 'continued':
      return (
        <ContinuedLine
          base={item.baseBranch}
          branch={item.branch}
          who={continuedBy(item.member, props.readers)}
        />
      )
  }
}
