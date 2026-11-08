import { useMemo, type ReactNode } from 'react'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import type { ChatHost } from '../../chat/components/SessionChat'
import type { ChatController } from '../../chat/state/controller'
import { WorkspaceChatView } from '../../chat/WorkspaceChat'
import type { WorkspaceStart } from '../../shared/workspaces'
import { useGo } from '../ui/AppLink'
import type { Action } from '../ui/useAction'
import { useFeatures, type WorkspaceContext } from './features'
import { useChatFiles } from './files/chat-files'
import { filesCenter } from './files/files-features'
import { SandboxBar, type SandboxNoticeState } from './SandboxNotice'
import { StartingCard } from './StartingCard'
import { ChatColumn } from './WorkspaceColumns'

/**
 * The kept chat of the workspace, with the parts that the shell draws, and
 * the open files: their tabs after the session tabs, and `content`, a file
 * or diff tab in place of the chat of the session.
 */
function KeptChat(props: {
  context: WorkspaceContext
  chat: ChatController
  host: ChatHost
  content: ReactNode
}) {
  const { context } = props
  const services = useServices()
  const go = useGo()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const files = useChatFiles(context, props.content)
  return (
    <WorkspaceChatView
      clock={clock}
      content={props.content}
      controller={props.chat}
      extraTabs={files.extraTabs}
      host={props.host}
      onConnectAgent={(agent) => go(routes.account(agent))}
      onOpenDiff={files.onOpenDiff}
      viewport={context.viewport === 'phone' ? 'mobile' : 'desktop'}
    />
  )
}

/**
 * The chat area of the open workspace: the session tabs, the chat, and its
 * composer. The shell draws the start steps at the end of the chat and the
 * bar of a sandbox that is down, from its own record of the workspace, and
 * the chat places them. `notice` is that bar's state: a start that the app
 * refused, with its reason, or a start that failed, with the message that
 * the workspace saved for it. The chat shows the open file tabs, and on
 * desktop the file or diff tab of the address in place of the chat of its
 * session. A host that gives the `tabs`, `transcript`, or `composer` slot
 * gets the shell's own column with those slots instead. A `center` part of
 * the host takes the place of the chat.
 */
export function ChatArea(props: {
  context: WorkspaceContext
  chat: ChatController
  start: WorkspaceStart | null
  notice: SandboxNoticeState | null
  resume: Action<[]>
}) {
  const features = useFeatures()
  const { context, notice } = props
  const { sandbox, workspace } = context
  const phone = context.viewport === 'phone'
  const starting =
    sandbox === 'starting' && props.start ? (
      <StartingCard start={props.start} />
    ) : null
  const sandboxBar = notice ? (
    <SandboxBar notice={notice} resume={props.resume} workspace={workspace} />
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
        content={features.center ? null : filesCenter(context)}
        context={context}
        host={{ starting, sandboxBar }}
      />
    )
  )
}
