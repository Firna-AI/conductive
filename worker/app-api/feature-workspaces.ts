import type { AppDependencies, AppEnv } from '../env'
import { requiredString } from '../http'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import type { RequestContext } from '../security/gate'
import {
  invalidShellInput,
  optionalShellPosition,
  optionalShellString,
} from './feature-shell-access'
import { changeWorkspaceMetadata } from './workspace-metadata'
import { workspaceBinding, workspaceForViewer } from './workspace-state'

export async function featureWorkspaceWrite(
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  workspaceId: string,
): Promise<Response> {
  if (!context.org) throw invalidShellInput()
  const orgId = context.org.id
  const userId = context.user.id
  await changeWorkspaceMetadata(
    env,
    dependencies,
    orgId,
    userId,
    workspaceId,
    () => {
      const nameInput = optionalShellString(context.body?.name)
      const name =
        nameInput === undefined ? undefined : requiredString(nameInput)
      const sectionId = optionalShellString(context.body?.sectionId)
      const position = optionalShellPosition(context.body?.position)
      return { name, sectionId, position }
    },
  )
  const binding = workspaceBinding(env).getByName(workspaceId)
  const lifecycle = await binding.readLifecycle()
  return Response.json({
    workspace: await workspaceForViewer(
      env,
      userId,
      workspaceView(
        await readWorkspace(env.DB, orgId, workspaceId),
        env.APP_ORIGIN,
      ),
    ),
    start: lifecycle?.start ?? null,
    error: lifecycle?.error ?? null,
  })
}
