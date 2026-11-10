import type { WorkspaceModel } from '../../app/workspace-model'
import type { ChatController } from '../../chat/state/controller'
import { useAction, type Action } from '../ui/useAction'

/**
 * Resume, Try again, and Activate of the open workspace, for each of its
 * controls. Activate names the early session of this person in its reply,
 * which can be a new session beside an open one. The chat shows that
 * session once it has it, unless the person chose another tab since the
 * press, or a page shows in place of the chat.
 */
export function useStartAction(
  model: WorkspaceModel,
  chat: ChatController,
  activates: boolean,
): Action<[]> {
  return useAction(
    async () => {
      const since = chat.choiceCount()
      const sessionId = await model.resume()
      if (sessionId !== null) chat.showSession(sessionId, since)
    },
    activates
      ? "The workspace couldn't be activated."
      : "The sandbox didn't start.",
  )
}
