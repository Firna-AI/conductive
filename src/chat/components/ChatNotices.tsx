import {
  CircleAlert,
  MessageSquarePlus,
  Plug,
  RotateCcw,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import {
  linkedReasonText,
  linkedTitle,
  type LinkedReason,
} from '../../ui/components/chat/linkedCopy'
import { Notice } from '../../ui/components/common/Notice'
import {
  reopenBody,
  reopenTitle,
} from '../../ui/components/explain/explainCopy'
import type { SendBlock } from '../state/blockers'
import type { ChatNotice } from '../state/chat-snapshot'
import { ActionButton, IconButton } from '../ui/actions'
import { agentNames } from './AgentMark'

/**
 * The notice over the composer when the agent is not connected.
 * Its action opens the Connect form of that agent. While it shows, its
 * watch keeps the login status of the account current, so that a read can
 * show a login that serves, as `ChatRuns.watchMissingLogin` says.
 */
export function BlockNotice(props: {
  block: SendBlock
  model: string
  onConnectAgent?: (agent: Agent) => void
  /**
   * Starts the watch, and returns its end. Keep it stable: a new value ends
   * the watch and starts another one, which reads the account again.
   */
  watch: () => () => void
}) {
  const { block, onConnectAgent, watch } = props
  // The watch starts when the notice shows, and ends when it goes.
  useEffect(() => watch(), [watch])
  const name = agentNames[block.agent]
  return (
    <Notice
      action={
        onConnectAgent ? (
          <ActionButton icon={Plug} onPress={() => onConnectAgent(block.agent)}>
            {`Connect ${name}`}
          </ActionButton>
        ) : undefined
      }
      icon={Plug}
      title={`Connect ${name} to use ${props.model}`}
    />
  )
}

/**
 * The notice over the composer when the login of the session is not
 * available, or its owner keeps it for their own messages, so the message
 * starts a new session on the default login of the reader. `owner` names
 * the owner of the login of the session: another member, or the org. It is
 * null for the reader's own login and for an older record that names no
 * starter, so the notice then names nobody.
 */
export function LinkedSessionNotice(props: {
  agent: Agent
  owner: string | null
  reason: LinkedReason
}) {
  const agent = agentNames[props.agent]
  return (
    <Notice
      body={linkedReasonText(props.reason, props.owner, agent)}
      icon={MessageSquarePlus}
      title={linkedTitle}
    />
  )
}

/** An action that failed, with the cause, until the user dismisses it. */
export function ActionNotice(props: {
  notice: ChatNotice
  onDismiss: () => void
}) {
  return (
    <Notice
      action={
        <IconButton icon={X} label="Dismiss" onPress={props.onDismiss} quiet />
      }
      body={props.notice.message}
      icon={CircleAlert}
      title={props.notice.title}
      tone="danger"
    />
  )
}

/**
 * The notice over the follow-up field of an explanation whose tab is
 * closed: a follow-up or Expand reopens it.
 */
export function ReopenNotice() {
  return <Notice body={reopenBody} icon={RotateCcw} title={reopenTitle} />
}
