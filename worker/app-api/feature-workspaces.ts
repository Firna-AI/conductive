import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import type { RequestContext } from '../security/gate'
import {
  invalidShellInput,
  optionalShellPosition,
  optionalShellString,
  requireShellWriter,
} from './feature-shell-access'
import {
  shellSectionExists,
  updateShellWorkspace,
} from './feature-workspaces-data'
import {
  requireWritableWorkspace,
  workspaceBinding,
  workspaceForViewer,
} from './workspace-state'

export async function featureWorkspaceWrite(
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  workspaceId: string,
): Promise<Response> {
  if (!context.org) throw invalidShellInput()
  const orgId = context.org.id
  const userId = context.user.id
  await requireShellWriter(env.DB, orgId, userId)
  const current = await readWorkspace(env.DB, orgId, workspaceId)
  requireWritableWorkspace(current)
  const nameInput = optionalShellString(context.body?.name)
  const name = nameInput === undefined ? undefined : requiredString(nameInput)
  const sectionId = optionalShellString(context.body?.sectionId)
  const position = optionalShellPosition(context.body?.position)
  if (
    sectionId !== undefined &&
    !(await shellSectionExists(env.DB, orgId, sectionId))
  )
    throw sectionNotFound()
  const binding = workspaceBinding(env).getByName(workspaceId)
  if (
    !(await updateShellWorkspace(env.DB, {
      orgId,
      userId,
      workspaceId,
      sectionId,
      name,
      position,
      now: dependencies.now(),
    }))
  ) {
    await requireShellWriter(env.DB, orgId, userId)
    requireWritableWorkspace(await readWorkspace(env.DB, orgId, workspaceId))
    throw sectionNotFound()
  }
  await binding.publishWorkspaceMetadata(orgId, workspaceId)
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

function sectionNotFound(): HttpError {
  return new HttpError(
    404,
    'section_not_found',
    'The section is not available.',
  )
}
