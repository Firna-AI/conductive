import { CircleAlert } from 'lucide-react'
import type { UserMessage } from '../../shared/generated/UserMessage'
import { ContinuedLine } from '../../../docs/mockups/src/components/chat/ContinuedLine'
import { RepositoryChangedLine } from '../../../docs/mockups/src/components/chat/RepositoryChangedLine'
import {
  StopLine,
  type StopSource,
} from '../../../docs/mockups/src/components/chat/StopLine'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import styles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { filesWithoutChip } from '../links/chat-parts'
import { ChatText, SessionLinkText, useChatParts } from '../links/LinkedText'
import type { SingleItem } from '../../shared/transcript/transcript-entries'
import {
  continuedBy,
  turnCopy,
  type ChatReaders,
} from '../../shared/transcript/turn-words'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { AgentText } from './AgentText'
import { SentFiles } from './AttachmentChips'
import { LostEventLine } from './LostEventLine'
import type { StopFacts } from './turn-facts'

/**
 * A message that a person sent. Each part in backticks is code, and each
 * workspace link is a chip. Each mention of an entry of the file tree is a
 * file chip, and each mention of a file of the message is the chip of that
 * file, at its place. That chip opens the copy of the file only after the
 * message went out to the agent. The files that no chip shows stay under
 * the message.
 */
export function UserBubble(props: {
  message: Pick<UserMessage, 'text' | 'attachments' | 'state'>
}) {
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

/**
 * Who stopped a turn, as its line names it: the chip of the session whose
 * agent stopped the turn with a workspace tool, else the words of a Stop
 * that a member pressed, or of a stop without one.
 */
function stopSource(attribution: StopFacts['attribution']): StopSource {
  if (attribution.kind === 'text') {
    return { kind: 'words', text: attribution.text }
  }
  const { workspaceId, sessionId } = attribution.reference
  return {
    kind: 'session',
    chip: <SessionLinkText sessionId={sessionId} workspaceId={workspaceId} />,
  }
}

/** The line of a stopped turn: who stopped it, then the notes of its end. */
export function StoppedLine(props: { facts: StopFacts }) {
  const { facts } = props
  return <StopLine notes={facts.notes} source={stopSource(facts.attribution)} />
}

export interface ItemActions {
  /** Whether this failed item may offer Try again. */
  canRetry: boolean
  retrying: boolean
  onRetry: (messageId: string) => void
}

/**
 * An item whose part shows only its own data and the readers. The end of a
 * turn and the line of a stopped turn also show data that the transcript
 * keeps about their turn, as `EndFacts` and `StopFacts` say.
 */
export type PlainItem = Exclude<SingleItem, { kind: 'turn-end' | 'stopped' }>

/**
 * One part of a session's chat, other than a run of tool calls, the end of
 * a turn, and the line of a stopped turn.
 */
export function ItemView(props: {
  item: PlainItem
  actions: ItemActions
  readers: ChatReaders
}) {
  const { item, actions } = props
  switch (item.kind) {
    case 'user':
      return <UserBubble message={item.message} />
    case 'agent':
      return <AgentText id={item.id} text={item.text} />
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
    case 'capabilities-changed':
      return null
    case 'continued':
      return (
        <ContinuedLine
          base={item.baseBranch}
          branch={item.branch}
          who={continuedBy(item.member, props.readers)}
        />
      )
    case 'repository-changed':
      return (
        <RepositoryChangedLine
          branch={item.branch}
          repository={item.repository.fullName}
          who={continuedBy(item.member, props.readers)}
        />
      )
  }
}
