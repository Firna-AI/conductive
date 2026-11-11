import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { configuredDefaultChoice, configuredModels } from '../app-api/models'
import { createAgentToolsHandler } from './handler'
import { requireFeatureResult } from '../features/result'
import {
  createWorkspaceFromTool,
  replayWorkspaceFromTool,
} from './workspace-create-composition'
import { writeWorkspaceFromTool } from './workspace-write-composition'
import { writeSessionFromTool } from './session-write-composition'

export function productionAgentTools(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<Response> {
  return createAgentToolsHandler(
    {
      DB: env.DB,
      MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
      APP_ORIGIN: env.APP_ORIGIN,
    },
    {
      writeWorkspace: (input) =>
        writeWorkspaceFromTool(env, dependencies, input),
      models: async () => configuredModels(env),
      writeSession: (input) => writeSessionFromTool(env, dependencies, input),
      listSessions: async (orgId, workspaceId) =>
        requireFeatureResult(
          await workspaceBinding(env)
            .getByName(workspaceId)
            .listAgentSessions(orgId, workspaceId, env.APP_ORIGIN),
        ),
      readSession: async (orgId, workspaceId, sessionId, input) =>
        requireFeatureResult(
          await workspaceBinding(env)
            .getByName(workspaceId)
            .readAgentSession(
              orgId,
              workspaceId,
              sessionId,
              input,
              env.APP_ORIGIN,
            ),
        ),
      callingTurn: (id, turnId) =>
        workspaceBinding(env).getByName(id).callingToolTurn(id, turnId),
      ownerDefaultChoice: async () => configuredDefaultChoice(env),
      createWorkspace: (input) =>
        createWorkspaceFromTool(env, dependencies, input),
      replayWorkspaceCreation: (input) =>
        replayWorkspaceFromTool(env, dependencies, input),
    },
  )(request)
}
