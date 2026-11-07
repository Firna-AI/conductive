import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'
import type { WorkspaceRuntime } from './workspace-runtime'

export function workspaceOwnerChangedHook(
  runtime: WorkspaceRuntime,
): (workspaceId: string) => Promise<void> {
  return async (workspaceId) => {
    if (await activeStoppedWorkspace(runtime.env.DB, workspaceId))
      await runtime.workspace(workspaceId).lifecycleActivity()
  }
}

function activeStoppedWorkspace(db: D1Database, workspaceId: string) {
  return db
    .prepare(
      `SELECT w.id FROM workspaces w WHERE w.id = ? AND w.state = 'stopped'
       AND w.sandbox_id IS NOT NULL AND ${workspaceTokenResourcePredicate}`,
    )
    .bind(workspaceId)
    .first<{ id: string }>()
}
