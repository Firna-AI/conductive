import type { WorkspaceResponse } from '../../src/shared/workspaces'
import { readWorkspace, workspaceView } from './workspace-data'
import type {
  WorkspaceRuntime,
  FirstWorkspaceMessage,
} from './workspace-runtime'
import { WorkspaceStartError } from './workspace-start'
import {
  presentWorkspace,
  type WorkspaceSnapshot,
} from '../data/workspace-link'

export interface ProvisionedWorkspace extends WorkspaceResponse {
  first: FirstWorkspaceMessage
}

export interface SavedProvisionedWorkspace extends Omit<
  ProvisionedWorkspace,
  'workspace'
> {
  workspace: WorkspaceSnapshot
}

export async function presentProvisionedWorkspace(
  runtime: WorkspaceRuntime,
  saved: SavedProvisionedWorkspace,
): Promise<ProvisionedWorkspace> {
  const { orgId, id } = saved.workspace
  const row = await readWorkspace(runtime.env.DB, orgId, id)
  return {
    ...saved,
    workspace: presentWorkspace(saved.workspace, {
      origin: runtime.env.APP_ORIGIN,
      orgId,
      workspaceId: id,
      number: row.number,
    }),
  }
}

export async function workspaceResponse(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceResponse> {
  const row = await readWorkspace(runtime.env.DB, orgId, workspaceId)
  const state = await runtime.workspace(workspaceId).readLifecycle()
  return {
    workspace: workspaceView(row, runtime.env.APP_ORIGIN),
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
