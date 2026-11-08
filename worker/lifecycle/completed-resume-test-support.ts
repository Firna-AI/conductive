import { resumeWorkspace } from './workspace-resume'
import { workspaceResponse } from './workspace-response'
import { workspaceStartFailure } from './workspace-start'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { WorkspaceResponse } from '../../src/shared/workspaces'

async function completed(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
  operation: (tracked: WorkspaceRuntime) => Promise<WorkspaceResponse>,
): Promise<WorkspaceResponse> {
  let accepted = false
  const tracked: WorkspaceRuntime = {
    ...runtime,
    workspace: (id) => {
      const endpoint = runtime.workspace(id)
      return {
        ...endpoint,
        queueLifecycleStart: async (job) => {
          const queued = await endpoint.queueLifecycleStart(job)
          if (id === workspaceId) accepted ||= queued
          return queued
        },
      }
    },
  }
  const response = await operation(tracked)
  if (!accepted) return response
  const result = await runtime.workspace(workspaceId).waitLifecycleStart()
  if (!result.ok) throw workspaceStartFailure(result.error)
  return workspaceResponse(runtime, orgId, workspaceId)
}

/** Tests that need the finished machine wait beyond the public queued reply. */
export const resumeCompletedWorkspace: typeof resumeWorkspace = async (
  ...args
) =>
  completed(args[0], args[1], args[2], (runtime) =>
    resumeWorkspace(runtime, args[1], args[2], args[3]),
  )
