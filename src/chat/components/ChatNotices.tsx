import { CircleAlert, Plug, X } from 'lucide-react'
import type { Agent } from '../../shared/agents'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import type { SendBlock } from '../state/blockers'
import type { ChatNotice } from '../state/chat-snapshot'
import { ActionButton, IconButton } from '../ui/actions'
import { agentNames } from './AgentMark'

/**
 * The notice over the composer when the agent is not connected.
 * Its action opens the Connect form of that agent.
 */
export function BlockNotice(props: {
  block: SendBlock
  model: string
  onConnectAgent?: (agent: Agent) => void
}) {
  const { block, onConnectAgent } = props
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
