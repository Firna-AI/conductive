import { useMemo } from 'react'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import type { ChatHost } from '../../chat/components/SessionChat'
import type { ChatController } from '../../chat/state/controller'
import { WorkspaceChatView } from '../../chat/WorkspaceChat'
import type { WorkspaceStart } from '../../shared/workspaces'
import { useGo } from '../ui/AppLink'
import type { Action } from '../ui/useAction'
import { useFeatures, type WorkspaceContext } from './features'
import { SandboxBar } from './SandboxNotice'
import { StartingCard } from './StartingCard'
import { ChatColumn } from './WorkspaceColumns'

/** The kept chat of the workspace, with the parts that the shell draws. */
function KeptChat(props: {
  chat: ChatController
  host: ChatHost
  phone: boolean
}) {
  const services = useServices()
  const go = useGo()
  const clock = useMemo(() => ({ now: services.now }), [services])
  return (
    <WorkspaceChatView
      clock={clock}
      controller={props.chat}
      host={props.host}
      onConnectAgent={(agent) => go(routes.account(agent))}
      viewport={props.phone ? 'mobile' : 'desktop'}
    />
  )
}

/**
 * The chat area of the open workspace: the session tabs, the chat, and its
 * composer. The shell draws the start steps at the end of the chat and the
 * bar of a sandbox that is down, from its own record of the workspace, and
 * the chat places them. A host that gives the `tabs`, `transcript`, or
 * `composer` slot gets the shell's own column with those slots instead. A
 * `center` part takes the place of the chat.
 */
export function ChatArea(props: {
  context: WorkspaceContext
  chat: ChatController
  start: WorkspaceStart | null
  resume: Action<[]>
}) {
  const features = useFeatures()
  const { context } = props
  const { sandbox, workspace } = context
  const phone = context.viewport === 'phone'
  const problem = sandbox === 'ready' || sandbox === 'starting' ? null : sandbox
  const starting =
    sandbox === 'starting' && props.start ? (
      <StartingCard start={props.start} />
    ) : null
  const sandboxBar = problem ? (
    <SandboxBar problem={problem} resume={props.resume} workspace={workspace} />
  ) : null
  const center = features.center?.(context) ?? null
  if (features.tabs || features.transcript || features.composer) {
    return (
      <>
        {features.tabs?.(context)}
        {center ?? (
          <ChatColumn
            footer={sandboxBar ?? features.composer?.(context)}
            phone={phone}
            starting={starting}
            transcript={features.transcript?.(context)}
          />
        )}
      </>
    )
  }
  return (
    center ?? (
      <KeptChat
        chat={props.chat}
        host={{ starting, sandboxBar }}
        phone={phone}
      />
    )
  )
}
