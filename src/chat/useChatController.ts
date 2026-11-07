import { useCallback } from 'react'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../app/workspace-store'
import type { FetchLike } from './api/client'
import type { ChatSnapshot } from './state/chat-snapshot'
import { ChatController } from './state/controller'
import type { SubscribeToWorkspace } from './stream/workspace-stream'

export interface ChatConnection {
  orgId: string
  workspaceId: string
  /** The browser's `fetch`, or a fake with the same shape. Keep it stable. */
  fetch: FetchLike
  /** Opens the workspace event stream. Keep it stable. */
  subscribe: SubscribeToWorkspace
}

/** Starts a run of the chat. Its stop makes late replies change nothing. */
function startChat(controller: ChatController): () => void {
  void controller.start()
  return controller.stop
}

/**
 * The controller of one workspace's chat and its current snapshot. A new
 * workspace, `fetch`, or `subscribe` makes a new controller, so pass stable
 * functions. The controller starts when the component mounts and stops when
 * it unmounts.
 */
export function useChatController(connection: ChatConnection): {
  controller: ChatController
  snapshot: ChatSnapshot
} {
  const { orgId, workspaceId, fetch, subscribe } = connection
  const create = useCallback(
    (target: WorkspaceIdentity) =>
      new ChatController({ target, fetch, subscribe }),
    [fetch, subscribe],
  )
  const { store, snapshot } = useWorkspaceStore(
    { orgId, workspaceId },
    { create, connect: startChat },
  )
  return { controller: store, snapshot }
}
