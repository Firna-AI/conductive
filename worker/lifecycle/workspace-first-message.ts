import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceController } from './workspace-controller-types'
import type { FirstWorkspaceMessage } from './workspace-runtime'

export async function acceptLifecycleMessage(
  chat: WorkspaceChat,
  controller: WorkspaceController,
  first: FirstWorkspaceMessage,
) {
  const message = await chat.acceptFirstMessage(first)
  await controller.acknowledgeLifecycleFirstMessage()
  return message
}
