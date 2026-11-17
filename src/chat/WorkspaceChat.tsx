import { useSyncExternalStore } from 'react'
import { ChatBody } from './components/ChatBody'
import type { ChatViewProps } from './components/chat-view-props'
import { ChatToasts } from './components/TranscriptCopy'
import type { ChatController } from './state/controller'
import { useChatController, type ChatConnection } from './useChatController'

export interface WorkspaceChatProps extends ChatConnection, ChatViewProps {}

/**
 * The chat of one workspace: the session tabs with the session history, and
 * the chat of each shown session with its composer, in one or two panes. It
 * loads through `client` and follows the workspace through `subscribe`. Give
 * it a stable `client` and `subscribe`, as `useChatController` says.
 */
export function WorkspaceChat(props: WorkspaceChatProps) {
  const { controller, snapshot } = useChatController(
    props,
    props.readOnly ?? false,
  )
  return (
    <ChatToasts>
      <ChatBody {...props} controller={controller} snapshot={snapshot} />
    </ChatToasts>
  )
}

/**
 * The chat of a controller that the app keeps, such as across the pages of
 * a tab. The app shows and hides the controller itself, as
 * `ChatController.show` says. This view only draws it.
 */
export function WorkspaceChatView(
  props: ChatViewProps & { controller: ChatController },
) {
  const { controller } = props
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  return (
    <ChatToasts>
      <ChatBody {...props} snapshot={snapshot} />
    </ChatToasts>
  )
}
