import type { ChatCallbackPublisher } from '../chat/types'
import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import { HttpError } from '../http'

export async function projectInputState(
  chat: WorkspaceChat,
  controller: WorkspaceController,
  request: { workspaceId: string; sessionId: string },
  at: number,
  publish: ChatCallbackPublisher,
) {
  const session = await chat.store.read(request.workspaceId, (view) =>
    view.session(request.sessionId),
  )
  try {
    return await controller.projectDeviceState(
      request.workspaceId,
      session?.choice,
      at,
      async ({ event, occurredAt }) => publish(event, occurredAt),
    )
  } catch (error) {
    if (
      error instanceof HttpError &&
      error.status === 404 &&
      error.code === 'workspace_not_found'
    )
      return true
    throw error
  }
}
