import type { User } from '../../src/shared/api'
import type {
  CreateWorkspaceRequest,
  WorkspaceResponse,
} from '../../src/shared/workspaces'
import { readWorkspace, workspaceView } from './workspace-data'
import type {
  WorkspaceRuntime,
  FirstWorkspaceMessage,
} from './workspace-runtime'

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
            ((await runtime.workspace(workspaceId).readLifecycleStartLog()) ||
              null),
        }
      : null,
  }
}

export async function provisionedResponse(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
  user: User,
  request: CreateWorkspaceRequest,
): Promise<ProvisionedWorkspace> {
  const row = await readWorkspace(runtime.env.DB, orgId, workspaceId)
  return {
    ...(await workspaceResponse(runtime, orgId, workspaceId)),
    first: {
      workspaceId,
      sessionId: row.sessionId,
      turnId: row.firstTurnId,
      sender: user,
      request: request.firstMessage,
    },
  }
}
