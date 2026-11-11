import type { AppEnv } from '../env'
import { readWorkspace, workspaceRecord } from './workspace-data'
import type {
  FirstWorkspaceMessage,
  WorkspaceLifecycleEndpoint,
} from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'
import type { SavedProvisionedWorkspace } from './workspace-response'
import { startCallInPlace, type StartCall } from './start-guard'

export async function creationAdmissionResponse(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  job: WorkspaceStartJob,
  acceptedFirst?: FirstWorkspaceMessage,
  call: StartCall = startCallInPlace,
): Promise<SavedProvisionedWorkspace> {
  if (!job.creation) throw new Error('Missing admitted first message')
  const row = await call(() =>
    readWorkspace(env.DB, job.orgId, job.workspaceId),
  )
  const state = await endpoint.readLifecycle()
  const first = state?.pendingFirstMessage ?? acceptedFirst?.request
  if (!first) throw new Error('Missing stored first message')
  return {
    workspace: workspaceRecord(row),
    start: state?.start ?? null,
    error: null,
    first: {
      workspaceId: job.workspaceId,
      sessionId: job.creation.sessionId,
      turnId: job.turnId,
      sender: job.creation.sender,
      request: first,
    },
  }
}
