import { CircleAlert, KeyRound, MessageSquarePlus, Plug, X } from 'lucide-react'
import type { Agent } from '../../shared/agents'
import type { OrgRole } from '../../shared/api'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import type { SendBlock } from '../state/blockers'
import type { ChatNotice } from '../state/chat-snapshot'
import { ActionButton, IconButton } from '../ui/actions'
import { agentNames } from './AgentMark'

/**
 * The notice over the composer when a message cannot go yet, from decision
 * 33: the agent of the chosen model is not connected, or the org has no key
 * for its cloud computers. It names no provider, as decision 47 says. Only
 * an admin adds the key, so only an admin gets its action.
 */
export function BlockNotice(props: {
  block: SendBlock
  model: string
  org: { name: string; role: OrgRole } | null
  onConnectAgent?: (agent: Agent) => void
  onAddBoatKey?: () => void
}) {
  const { block, onConnectAgent, onAddBoatKey } = props
  if (block.kind === 'no-login') {
    const name = agentNames[block.agent]
    return (
      <Notice
        action={
          onConnectAgent ? (
            <ActionButton
              icon={Plug}
              onPress={() => onConnectAgent(block.agent)}
            >
              {`Connect ${name}`}
            </ActionButton>
          ) : undefined
        }
        icon={Plug}
        title={`Connect ${name} to use ${props.model}`}
      />
    )
  }
  const org = props.org?.name ?? 'your org'
  if (props.org?.role !== 'admin') {
    return (
      <Notice
        body={`An admin of ${org} adds it in the org settings.`}
        icon={KeyRound}
        title={`The cloud computers of ${org} need a key`}
      />
    )
  }
  return (
    <Notice
      action={
        onAddBoatKey ? (
          <ActionButton icon={KeyRound} onPress={onAddBoatKey}>
            Add key
          </ActionButton>
        ) : undefined
      }
      icon={KeyRound}
      title={`Add a key for the cloud computers of ${org}`}
    />
  )
}

/**
 * The notice over the composer when the login of the starter is not
 * available, so the message starts a new session on the reader's own login.
 * An older record names no starter, so the notice names nobody.
 */
export function LinkedSessionNotice(props: {
  agent: Agent
  starter: string | null
}) {
  const body =
    props.starter === null
      ? 'The login for this session is not available.'
      : `${props.starter}'s ${agentNames[props.agent]} login is not available.`
  return (
    <Notice
      body={body}
      icon={MessageSquarePlus}
      title="Your message starts a new session"
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
