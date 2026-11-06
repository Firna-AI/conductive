import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../shared/events'
import type { ApiFetch } from './request'

/**
 * Delivers the events of the workspace in order, and returns a function that
 * stops the delivery. A replay of earlier events is safe for the tools.
 */
export type SubscribeWorkspaceEvents = (
  listener: (envelope: WorkspaceEventEnvelope) => void,
) => () => void

/** What the requests of a tool need: the workspace and the app's fetch. */
export interface ToolRequests {
  orgId: string
  workspaceId: string
  fetch: ApiFetch
}

/**
 * What a tool needs from the workspace screen: its requests and the events of
 * its workspace. Keep `fetch` and `subscribe` stable across renders: a new
 * `fetch` loads the data again, and a new `subscribe` subscribes again.
 */
export interface ToolWorkspace extends ToolRequests {
  subscribe: SubscribeWorkspaceEvents
}

/**
 * The React key of a tool's lifetime. Another workspace starts the tool again,
 * so no state, frame, or connection of the old workspace stays.
 */
export function workspaceKey(workspace: ToolRequests): string {
  return JSON.stringify([workspace.orgId, workspace.workspaceId])
}

/**
 * Subscribes to the events of one workspace. `onEvent` gets each event of
 * that workspace in the order of its `subscribe`, and no event of another.
 */
export function subscribeToWorkspace(
  workspace: Pick<ToolWorkspace, 'workspaceId' | 'subscribe'>,
  onEvent: (event: WorkspaceEvent) => void,
): () => void {
  return workspace.subscribe((envelope) => {
    if (envelope.workspaceId === workspace.workspaceId) onEvent(envelope.event)
  })
}
