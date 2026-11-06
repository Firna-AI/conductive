import { useEffect, useEffectEvent } from 'react'
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

/**
 * What a tool needs from the workspace screen. Keep `fetch` and `subscribe`
 * stable across renders: a new `fetch` loads the data again, and a new
 * `subscribe` subscribes again.
 */
export interface ToolWorkspace {
  orgId: string
  workspaceId: string
  fetch: ApiFetch
  subscribe?: SubscribeWorkspaceEvents
}

/**
 * The React key of a tool's lifetime. Another workspace starts the tool again,
 * so no state, frame, or connection of the old workspace stays.
 */
export function workspaceKey(workspace: ToolWorkspace): string {
  return JSON.stringify([workspace.orgId, workspace.workspaceId])
}

/** Calls `onEvent` for each event of this workspace, and for no other. */
export function useWorkspaceEvents(
  workspace: ToolWorkspace,
  onEvent: (event: WorkspaceEvent) => void,
): void {
  const { subscribe, workspaceId } = workspace
  const handle = useEffectEvent(onEvent)
  useEffect(() => {
    if (!subscribe) return undefined
    return subscribe((envelope) => {
      if (envelope.workspaceId === workspaceId) handle(envelope.event)
    })
  }, [subscribe, workspaceId])
}
