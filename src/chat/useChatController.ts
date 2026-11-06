import { useEffect, useMemo, useSyncExternalStore } from 'react'
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
  const controller = useMemo(
    () =>
      new ChatController({ target: { orgId, workspaceId }, fetch, subscribe }),
    [orgId, workspaceId, fetch, subscribe],
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
