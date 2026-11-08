import { useCallback, useEffect, useRef } from 'react'
import type { ApiClient } from '../app/api/client'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../app/workspace-store'
import type { ChatSnapshot } from './state/chat-snapshot'
import { ChatController } from './state/controller'
import type { SubscribeToWorkspace } from './stream/workspace-stream'

export interface ChatConnection {
  orgId: string
  workspaceId: string
  /** The JSON client of the app, or one over a fake API. Keep it stable. */
  client: ApiClient
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
 * workspace, `client`, or `subscribe` makes a new controller, so pass stable
 * ones. The controller starts when the component mounts and stops when it
 * unmounts. `readOnly` can change at any time: the controller reads its
 * newest value at each action, and keeps its run.
 */
export function useChatController(
  connection: ChatConnection,
  readOnly = false,
): {
  controller: ChatController
  snapshot: ChatSnapshot
} {
  const { orgId, workspaceId, client, subscribe } = connection
  const shownReadOnly = useRef(readOnly)
  useEffect(() => {
    shownReadOnly.current = readOnly
  }, [readOnly])
  const create = useCallback(
    (target: WorkspaceIdentity) =>
      new ChatController({
        target,
        client,
        subscribe,
        readOnly: () => shownReadOnly.current,
      }),
    [client, subscribe],
  )
  const { store, snapshot } = useWorkspaceStore(
    { orgId, workspaceId },
    { create, connect: startChat },
  )
  return { controller: store, snapshot }
}
