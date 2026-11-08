import type { WorkspaceResponse } from '../../src/shared/workspaces'
import { readWorkspace, workspaceView } from './workspace-data'
import type {
  WorkspaceRuntime,
  FirstWorkspaceMessage,
} from './workspace-runtime'
import { WorkspaceStartError } from './workspace-start'

export interface ProvisionedWorkspace extends WorkspaceResponse {
  first: FirstWorkspaceMessage
}

export async function workspaceResponse(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceResponse> {
  const row = await readWorkspace(runtime.env.DB, orgId, workspaceId)
  const state = await runtime.workspace(workspaceId).readLifecycle()
  return {
    workspace: workspaceView(row),
    start: state?.start ?? null,
    error: state?.error
      ? {
          ...state.error,
          log:
            state.error.log ??
            ((await runtime.workspace(workspaceId).readLifecycleStartLog())
              .text ||
              null),
        }
      : null,
  }
}

export async function provisionedResponse(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
): Promise<ProvisionedWorkspace> {
  const admission = await runtime.workspace(workspaceId).waitCreationAdmission()
  if (!admission.ok)
    throw Object.assign(
      new WorkspaceStartError(admission.error.log),
      admission.error,
    )
  return {
    ...(await workspaceResponse(runtime, orgId, workspaceId)),
    first: admission.created.first,
  }
}
