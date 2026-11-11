import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { configuredDefaultChoice, configuredModels } from '../app-api/models'
import { workspaceRuntime } from '../lifecycle/runtime'
import { createWorkspace } from '../lifecycle/workspaces'
import { workspaceStartFailure } from '../lifecycle/workspace-start'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import { createAgentToolsHandler } from './handler'
import { saveWorkspaceToolParent, toolUser } from './composition-data'
import { requireFeatureResult } from '../features/result'
import { sessionLink } from '../../src/shared/session-link'
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
      async createWorkspace(input) {
        const [owner, sender] = await Promise.all([
          toolUser(env.DB, input.orgId, input.owner.id),
          toolUser(env.DB, input.orgId, input.sender.id),
        ])
        const created = await createWorkspace(
          workspaceRuntime(env, dependencies),
          input.orgId,
          owner,
          {
            repositoryId: input.repositoryId,
            sectionId: input.sectionId,
            name: input.name,
            firstMessage: {
              id: dependencies.randomToken(),
              text: input.firstMessage,
              attachmentIds: [],
              choice: input.choice,
            },
          },
          sender,
        )
        const object = workspaceBinding(env).getByName(created.workspace.id)
        await object.acceptLifecycleFirstMessage(created.first)
        await saveWorkspaceToolParent(
          env.DB,
          input.orgId,
          created.workspace.id,
          input.createdByWorkspaceId,
        )
        const result = await workspaceRuntime(env, dependencies)
          .workspace(created.workspace.id)
          .waitCreationLifecycle()
        if (!result.ok) throw workspaceStartFailure(result.error)
        const workspace = workspaceView(
          await readWorkspace(env.DB, input.orgId, created.workspace.id),
          env.APP_ORIGIN,
        )
        return {
          workspace,
          sessionId: created.first.sessionId,
          sessionLink: sessionLink(
            env.APP_ORIGIN,
            input.orgId,
            created.workspace.id,
            created.first.sessionId,
          ),
        }
      },
    },
  )(request)
}
