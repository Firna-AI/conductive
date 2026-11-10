import type { WorkspaceChat } from '../chat/backend'
import { activeStoredTurn } from '../devices/access'
import type { WorkspaceController } from './workspace-controller-types'

export function credentialSender(
  chat: WorkspaceChat,
  controller: WorkspaceController,
  turnId: string,
): Promise<string | null> {
  return chat.runLifecycle(async () => {
    const preparing = await controller.credentialSender(turnId)
    if (preparing) return preparing
    const state = await controller.readLifecycle()
    if (!state || state.state === 'stopped' || state.state === 'archived')
      return null
    return (
      (await activeStoredTurn(chat, state.workspaceId, turnId))?.senderId ??
      null
    )
  })
}
