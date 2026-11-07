import type { AppEnv } from '../env'
import { readWorkspace, workspaceView } from './workspace-data'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'
import type { ProvisionedWorkspace } from './workspace-response'

export async function creationAdmissionResponse(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  job: WorkspaceStartJob,
): Promise<ProvisionedWorkspace> {
  if (!job.creation) throw new Error('Missing admitted first message')
  const row = await readWorkspace(env.DB, job.orgId, job.workspaceId)
  const state = await endpoint.readLifecycle()
  if (!state?.pendingFirstMessage)
    throw new Error('Missing stored first message')
  return {
    workspace: workspaceView(row),
    start: state.start,
    error: null,
    first: {
      workspaceId: job.workspaceId,
      sessionId: job.creation.sessionId,
      turnId: job.turnId,
      sender: job.creation.sender,
      request: state.pendingFirstMessage,
    },
  }
}
