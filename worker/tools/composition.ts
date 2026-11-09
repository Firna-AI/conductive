import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { configuredDefaultChoice, configuredModels } from '../app-api/models'
import { workspaceRuntime } from '../lifecycle/runtime'
import { createWorkspace } from '../lifecycle/workspaces'
import { workspaceStartFailure } from '../lifecycle/workspace-start'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import { createAgentToolsHandler } from './handler'
import { saveWorkspaceToolParent, toolUser } from './composition-data'

export function productionAgentTools(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<Response> {
  return createAgentToolsHandler(
    { DB: env.DB, MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '' },
    {
      models: async () => configuredModels(env),
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
        )
        return { workspace, sessionId: created.first.sessionId }
      },
    },
  )(request)
}
