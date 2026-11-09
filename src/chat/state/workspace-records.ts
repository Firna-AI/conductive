import type {
  OrderedWorkspaceResponse,
  Workspace,
  WorkspaceStart,
} from '../../shared/workspaces'
import type { ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'
import { noteFirstStart, withFirstStart } from './first-start'

/**
 * Shows the workspace record and the start steps of a read or a reply when
 * no newer state of them has shown, and says whether they showed. An older
 * one still counts for the first start, whose success the chat remembers.
 */
export function confirmWorkspace(
  context: ChatContext,
  reply: Pick<OrderedWorkspaceResponse, 'workspace' | 'start' | 'eventNumber'>,
): boolean {
  if (!context.live()) return false
  const newer = reply.eventNumber >= context.workspaceOrder.through
  if (newer) context.workspaceOrder.through = reply.eventNumber
  context.store.update((snapshot) =>
    newer
      ? withFirstStart({
          ...snapshot,
          workspace: reply.workspace,
          start: reply.start,
        })
      : noteFirstStart(snapshot, reply.workspace, reply.start),
  )
  return newer
}

/** A change of the workspace record from the stream, at its number. */
type WorkspaceChange =
  | { type: 'workspace.updated'; workspace: Workspace }
  | { type: 'workspace.title'; name: string }
  | { type: 'start.updated'; start: WorkspaceStart }

/**
 * The snapshot after a change of the workspace record from the stream. A
 * change that is not newer than the record that shows changes nothing but
 * the success of the first start.
 */
export function withWorkspaceChange(
  context: ChatContext,
  snapshot: ChatSnapshot,
  change: WorkspaceChange,
  eventNumber: number,
): ChatSnapshot {
  if (eventNumber <= context.workspaceOrder.through) {
    return change.type === 'workspace.updated'
      ? noteFirstStart(snapshot, change.workspace, null)
      : change.type === 'start.updated'
        ? noteFirstStart(snapshot, null, change.start)
        : snapshot
  }
  context.workspaceOrder.through = eventNumber
  switch (change.type) {
    case 'workspace.updated':
      return withFirstStart({ ...snapshot, workspace: change.workspace })
    case 'start.updated':
      return withFirstStart({ ...snapshot, start: change.start })
    case 'workspace.title':
      return snapshot.workspace
        ? {
            ...snapshot,
            workspace: { ...snapshot.workspace, name: change.name },
          }
        : snapshot
  }
}
