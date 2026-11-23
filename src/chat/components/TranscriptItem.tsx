import { CircleAlert } from 'lucide-react'
import type { UserMessage } from '../../shared/generated/UserMessage'
import { CapabilityChangeLine } from '../../ui/components/chat/CapabilityChangeLine'
import { ContinuedLine } from '../../ui/components/chat/ContinuedLine'
import { RepositoryChangedLine } from '../../ui/components/chat/RepositoryChangedLine'
import { StopLine, type StopSource } from '../../ui/components/chat/StopLine'
import { WakeLine } from '../../ui/components/chat/WakeLine'
import { classes } from '../../ui/components/common/classes'
import { Notice } from '../../ui/components/common/Notice'
import styles from '../../ui/components/chat/ChatItemView.module.css'
import { filesWithoutChip } from '../links/chat-parts'
import { ChatText, SessionLinkText, useChatParts } from '../links/LinkedText'
import { agentMessageId } from '../../shared/transcript/item-keys'
import type { SingleItem } from '../../shared/transcript/transcript-entries'
import {
  continuedBy,
  turnCopy,
  type ChatReaders,
} from '../../shared/transcript/turn-words'
import { MarkedMessage } from '../explain/MarkedMessage'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { AgentText } from './AgentText'
import { SentFiles } from './AttachmentChips'
import { LostEventLine } from './LostEventLine'
import type { StopFacts } from './turn-facts'

/**
 * A message that a person sent. Each part in backticks is code, and each
 * workspace link is a chip. Each mention of an entry of the file tree is a
 * file chip, each skill text of a listed skill is a skill chip, and each
 * mention of a file of the message is the chip of that
 * file, at its place. That chip opens the copy of the file only after the
 * message went out to the agent. The files that no chip shows stay under
 * the message.
 */
export function UserBubble(props: {
  message: Pick<UserMessage, 'id' | 'text' | 'attachments' | 'state'>
  /** The message is in the transcript, so Explain can mark its text. */
  accepted?: boolean
}) {
  const { message } = props
  const parts = useChatParts(message.text, {
    mentions: true,
    skills: true,
    attachments: message.attachments,
  })
  const listed = filesWithoutChip(parts, message.attachments)
  const text = <ChatText opens={message.state === 'sent'} parts={parts} />
  return (
    <div className={styles.user}>
      <div className={classes(styles.bubble, controls.lines)}>
        {props.accepted ? (
          <MarkedMessage align="end" bubble done messageId={message.id}>
            {text}
          </MarkedMessage>
        ) : (
          text
        )}
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
 * a turn, and the line of a stopped turn. `live` marks the agent message
 * that the agent writes now.
 */
export function ItemView(props: {
  item: PlainItem
  actions: ItemActions
  readers: ChatReaders
  live?: boolean
}) {
  const { item, actions } = props
  switch (item.kind) {
    case 'user':
      return <UserBubble accepted message={item.message} />
    case 'agent':
      return (
        <MarkedMessage
          align="middle"
          done={item.complete === true}
          messageId={agentMessageId(item)}
        >
          <AgentText id={item.id} live={props.live} text={item.text} />
        </MarkedMessage>
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
    case 'capabilities-changed':
      return (
        <CapabilityChangeLine
          changes={item.changes}
          who={continuedBy(item.member, props.readers)}
        />
      )
    case 'continued':
      // Each branch shows by its label, or by its real name without one.
      return (
        <ContinuedLine
          base={item.displayBaseBranch ?? item.baseBranch}
          branch={item.displayBranch ?? item.branch}
          who={continuedBy(item.member, props.readers)}
        />
      )
    case 'repository-changed':
      // The new branch shows by its label, or by its real name without one.
      return (
        <RepositoryChangedLine
          branch={item.displayBranch ?? item.branch}
          repository={item.repository.fullName}
          who={continuedBy(item.member, props.readers)}
        />
      )
    case 'wake': {
      // The chip of the watched session, as the line of a stop from a
      // session shows it. The chip names its workspace too.
      const { notice } = item
      return (
        <WakeLine
          end={notice.state}
          reason={notice.reason ?? undefined}
          session={
            <SessionLinkText
              sessionId={notice.watchedSession.id}
              workspaceId={notice.watchedWorkspaceId}
            />
          }
        />
      )
    }
  }
}
