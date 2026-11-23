import type { AgentSessionResume } from '../../src/shared/generated/AgentSessionResume'
import type { Workspace } from '../../src/shared/generated/Workspace'

import { resumesAtOpen } from '../../src/app/first-start'
import { workspaceResponse } from './workspace-response'
import { resumeWorkspace } from './workspace-resume'
import type { WorkspaceRuntime } from './workspace-runtime'

export async function startAcceptedMessage(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
  senderUserId: string,
): Promise<{ state: Workspace['state'] | null; resume: AgentSessionResume }> {
  const detail = await workspaceResponse(runtime, orgId, workspaceId)
  if (!resumesAtOpen(detail)) {
    return {
      state: null,
      resume: {
        state: detail.workspace.state === 'error' ? 'waiting' : 'not_needed',
        error: null,
      },
    }
  }
  const resuming = await resumeWorkspace(
    runtime,
    orgId,
    workspaceId,
    senderUserId,
  )
  return {
    state: resuming.workspace.state,
    resume:
      resuming.workspace.state === 'stopped' ||
      resuming.workspace.state === 'error'
        ? resuming.error
          ? {
              state: 'failed',
              error: {
                code: resuming.error.code,
                message: resuming.error.message,
              },
            }
          : { state: 'waiting', error: null }
        : { state: 'queued', error: null },
  }
}
