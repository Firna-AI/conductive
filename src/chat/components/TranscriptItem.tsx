import { CircleAlert, CircleStop } from 'lucide-react'
import type { UserMessage } from '../../shared/messages'
import { ContinuedLine } from '../../../docs/mockups/src/components/chat/ContinuedLine'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { filesWithoutChip } from '../links/chat-parts'
import { ChatText, useChatParts } from '../links/LinkedText'
import type { Transcript } from '../../shared/transcript/transcript'
import type { SingleItem } from '../../shared/transcript/transcript-entries'
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
import { TurnEnd } from './TurnEnd'

/**
 * A message that a person sent. Each part in backticks is code, and each
 * workspace link is a chip. Each mention of an entry of the file tree is a
 * file chip, and each mention of a file of the message is the chip of that
 * file, at its place. That chip opens the copy of the file only after the
 * message went out to the agent. The files that no chip shows stay under
 * the message.
 */
export function UserBubble(props: { message: UserMessage }) {
  const { message } = props
  const parts = useChatParts(message.text, {
    mentions: true,
    attachments: message.attachments,
  })
  const listed = filesWithoutChip(parts, message.attachments)
  return (
    <div className={styles.user}>
      <div className={classes(styles.bubble, controls.lines)}>
        <ChatText opens={message.state === 'sent'} parts={parts} />
      </div>
      {listed.length > 0 ? <SentFiles attachments={listed} /> : null}
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
  item: SingleItem
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
