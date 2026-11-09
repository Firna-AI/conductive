import type { Workspace, WorkspaceResponse } from '../shared/workspaces'
import type { ShellEvent } from './api/read-events'

/** Archive keeps the workspace record and ends its start and error state. */
export function archivedDetail(workspace: Workspace): WorkspaceResponse {
  return { workspace, start: null, error: null }
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
