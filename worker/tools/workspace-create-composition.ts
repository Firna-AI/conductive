import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { workspaceRuntime } from '../lifecycle/runtime'
import { createWorkspace, replayCreation } from '../lifecycle/workspaces'
import { workspaceStartFailure } from '../lifecycle/workspace-start'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import type { ProvisionedWorkspace } from '../lifecycle/workspace-response'
import { sessionLink } from '../../src/shared/session-link'
import { saveWorkspaceToolParent, toolUser } from './composition-data'
import type { ToolWorkspaceCreation, ToolWorkspaceReplay } from './services'

async function finishCreation(
  env: AppEnv,
  dependencies: AppDependencies,
  created: ProvisionedWorkspace,
  parentId: string,
) {
  const { orgId, id } = created.workspace
  await workspaceBinding(env)
    .getByName(id)
    .acceptLifecycleFirstMessage(created.first)
  await saveWorkspaceToolParent(env.DB, orgId, id, parentId)
  const result = await workspaceRuntime(env, dependencies)
    .workspace(id)
    .waitCreationLifecycle()
  if (!result.ok) throw workspaceStartFailure(result.error)
  return {
    workspace: workspaceView(
      await readWorkspace(env.DB, orgId, id),
      env.APP_ORIGIN,
    ),
    sessionId: created.first.sessionId,
    sessionLink: sessionLink(
      env.APP_ORIGIN,
      orgId,
      id,
      created.first.sessionId,
    ),
  }
}

export async function replayWorkspaceFromTool(
  env: AppEnv,
  dependencies: AppDependencies,
  input: ToolWorkspaceReplay,
) {
  const created = await replayCreation(workspaceRuntime(env, dependencies), {
    orgId: input.orgId,
    senderUserId: input.senderUserId,
    messageId: input.firstMessageId,
  })
  return created
    ? finishCreation(env, dependencies, created, input.createdByWorkspaceId)
    : null
}

export async function createWorkspaceFromTool(
  env: AppEnv,
  dependencies: AppDependencies,
  input: ToolWorkspaceCreation,
) {
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
      firstSessionTitle: input.firstSessionTitle,
      firstMessage: {
        id: input.firstMessageId,
        text: input.firstMessage,
        attachmentIds: [],
        choice: input.choice,
      },
    },
    sender,
  )
  return finishCreation(env, dependencies, created, input.createdByWorkspaceId)
}
