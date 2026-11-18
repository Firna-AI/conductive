import type { Workspace } from '../shared/generated/Workspace'
import {
  WORKSPACE_RESTORE_MS,
  type WorkspaceResponse,
} from '../shared/workspaces'
import type { ArchiveAction } from './archive-model'
import { replaceWorkspace } from './list-trees'
import { ready, type Loadable } from './store'

/** An Archive or a Restore of a workspace that runs, and when it started. */
export interface RunningWrite {
  action: ArchiveAction
  at: number
}

/**
 * The record that an Archive shows while its write waits for its reply,
 * so the Archive feels instant. It expects the usual reply: the workspace
 * is archived at `at`, and it can come back for the 14 days of Restore.
 * The reply then shows its own fields. A failed write shows the record as
 * it was, because only the running write puts this record over it. An
 * archived record stays as it is.
 */
function archivingWorkspace(workspace: Workspace, at: number): Workspace {
  if (workspace.state === 'archived') return workspace
  return {
    ...workspace,
    state: 'archived',
    archivedAt: at,
    restoreUntil: at + WORKSPACE_RESTORE_MS,
    updatedAt: Math.max(workspace.updatedAt, at),
  }
}

/**
 * The list with each Archive that runs shown as done. The live rows under
 * an archived row take its place, as the Worker writes them, so the list
 * does not change again when the reply comes.
 */
export function listWithArchives(
  list: Loadable<readonly Workspace[]>,
  running: ReadonlyMap<string, RunningWrite>,
): Loadable<readonly Workspace[]> {
  if (list.state !== 'ready') return list
  let workspaces = list.value
  for (const [workspaceId, write] of running) {
    if (write.action !== 'archive') continue
    workspaces = replaceWorkspace(workspaces, workspaceId, (workspace) =>
      archivingWorkspace(workspace, write.at),
    )
  }
  return workspaces === list.value ? list : ready(workspaces)
}

/**
 * The detail of the open workspace with its running Archive shown as done.
 * An archived workspace has no start steps and no start error.
 */
export function detailWithArchive(
  detail: Loadable<WorkspaceResponse>,
  write: RunningWrite | undefined,
): Loadable<WorkspaceResponse> {
  if (detail.state !== 'ready' || write?.action !== 'archive') return detail
  const workspace = archivingWorkspace(detail.value.workspace, write.at)
  if (workspace === detail.value.workspace) return detail
  return ready({ workspace, start: null, error: null })
}
