import type { Workspace, WorkspaceResponse } from '../shared/workspaces'
import type { ShellEvent } from './api/read-events'
import type { Change } from './resource'

/** Local name and owner replies change no other workspace detail fields. */
export function workspaceMetadata(
  fields: Partial<Pick<Workspace, 'name' | 'owner'>>,
): Change<WorkspaceResponse> {
  return (current) => ({
    ...current,
    workspace: { ...current.workspace, ...fields },
  })
}

/** Archive keeps the workspace record and ends its start and error state. */
export function archivedDetail(workspace: Workspace): WorkspaceResponse {
  return { workspace, start: null, error: null }
}

/** An Archive reply advances activity and ends its start, keeping newer fields. */
export function archiveReplyDetail(
  current: WorkspaceResponse,
  reply: WorkspaceResponse,
): WorkspaceResponse {
  return {
    ...current,
    start: reply.start,
    error: reply.error,
    workspace: {
      ...current.workspace,
      state: reply.workspace.state,
      archivedAt: reply.workspace.archivedAt,
      updatedAt: Math.max(
        current.workspace.updatedAt,
        reply.workspace.updatedAt,
      ),
    },
  }
}

/** A record from before Archive cannot replace its confirmed detail. */
export function detailAfterListArchive(
  current: WorkspaceResponse | undefined,
  incoming: WorkspaceResponse,
  archived: Workspace | undefined,
): WorkspaceResponse {
  if (!archived || incoming.workspace.state === 'archived') return incoming
  return current?.workspace.state === 'archived'
    ? current
    : archivedDetail(archived)
}

/**
 * The detail after an event of the stream. A workspace record applies its
 * saved public error with its state: a record without the error keeps the
 * current error, and null clears it. An event error carries no log, so the
 * detail keeps a null log for it.
 */
export function workspaceAfterEvent(
  detail: WorkspaceResponse,
  event: ShellEvent,
): WorkspaceResponse {
  if (
    detail.workspace.state === 'archived' &&
    event.type !== 'workspace.updated'
  ) {
    return detail
  }
  switch (event.type) {
    case 'workspace.updated':
      return {
        ...detail,
        workspace: event.workspace,
        ...(event.error === undefined
          ? {}
          : {
              error:
                event.error === null ? null : { ...event.error, log: null },
            }),
      }
    case 'start.updated':
      return { ...detail, start: event.start }
    case 'workspace.title':
      return { ...detail, workspace: { ...detail.workspace, name: event.name } }
  }
}
