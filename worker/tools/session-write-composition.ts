import type { AgentSessionResume } from '../../src/shared/generated/AgentSessionResume'
import type { AgentSessionWriteResponse } from '../../src/shared/generated/AgentSessionWriteResponse'

import { sessionLink } from '../../src/shared/session-link'
import { HttpError } from '../http'
import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { startAcceptedMessage } from '../lifecycle/accepted-message-start'
import { workspaceRuntime } from '../lifecycle/runtime'
import type { ToolSessionWrite } from './services'
import { toolSessionWorkspace } from './session-access'

export async function writeSessionFromTool(
  env: AppEnv,
  dependencies: AppDependencies,
  input: ToolSessionWrite,
): Promise<AgentSessionWriteResponse> {
  const admitted = requireFeatureResult(
    await workspaceBinding(env)
      .getByName(input.workspaceId)
      .writeAgentSession(input),
  )
  const { workspace: snapshot, ...accepted } = admitted
  let workspace = snapshot
  let resume: AgentSessionResume = { state: 'not_needed', error: null }
  if (accepted.message) {
    try {
      workspace = await toolSessionWorkspace(
        env.DB,
        input.orgId,
        input.workspaceId,
        env.APP_ORIGIN,
      )
      const started = await startAcceptedMessage(
        workspaceRuntime(env, dependencies),
        input.orgId,
        input.workspaceId,
        input.senderUserId,
      )
      if (started.state !== null)
        workspace = { ...workspace, state: started.state }
      resume = started.resume
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
      resume = {
        state: 'failed',
        error: { code: error.code, message: error.message },
      }
    }
  }
  return {
    ...accepted,
    workspace,
    session: {
      ...accepted.session,
      link: sessionLink(
        env.APP_ORIGIN,
        input.orgId,
        input.workspaceId,
        accepted.session.id,
      ),
    },
    resume,
  }
}
