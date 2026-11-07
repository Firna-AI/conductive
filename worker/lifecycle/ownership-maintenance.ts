import type { WorkspaceRuntime } from './workspace-runtime'

export function workspaceOwnerChangedHook(
  runtime: WorkspaceRuntime,
): (workspaceId: string) => Promise<void> {
  return (workspaceId) =>
    runtime.workspace(workspaceId).reconcileLifecycleAccess(workspaceId)
}
