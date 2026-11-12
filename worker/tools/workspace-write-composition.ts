import type { AppDependencies, AppEnv } from '../env'
import { changeWorkspaceMetadata } from '../app-api/workspace-metadata'
import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import type { ToolWorkspaceWrite } from './services'

export async function writeWorkspaceFromTool(
  env: AppEnv,
  dependencies: AppDependencies,
  input: ToolWorkspaceWrite,
): Promise<void> {
  const { orgId, workspaceId, senderUserId } = input
  if (input.kind === 'archive') {
    requireFeatureResult(
      await workspaceBinding(env)
        .getByName(workspaceId)
        .archiveWorkspace(orgId, workspaceId, senderUserId, env.APP_ORIGIN),
    )
    return
  }
  await changeWorkspaceMetadata(
    env,
    dependencies,
    orgId,
    senderUserId,
    workspaceId,
    () =>
      input.kind === 'rename'
        ? { name: input.name }
        : { sectionId: input.sectionId },
    input.kind === 'move',
  )
}
