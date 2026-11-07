import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ApiClient } from '../app/api/client'
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

/**
 * The controller of one workspace's chat and its current snapshot. A new
 * workspace, `client`, or `subscribe` makes a new controller, so pass stable
 * ones. The controller starts when the component mounts and stops when it
 * unmounts.
 */
export function useChatController(connection: ChatConnection): {
  controller: ChatController
  snapshot: ChatSnapshot
} {
  const { orgId, workspaceId, client, subscribe } = connection
  const controller = useMemo(
    () =>
      new ChatController({ target: { orgId, workspaceId }, client, subscribe }),
    [orgId, workspaceId, client, subscribe],
  )
  useEffect(() => {
    void controller.start()
    return controller.stop
  }, [controller])
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  return { controller, snapshot }
}
