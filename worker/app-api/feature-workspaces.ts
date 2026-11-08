import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import { requireOrgMember } from '../members/permissions'
import type { RequestContext } from '../security/gate'
import {
  invalidShellInput,
  optionalShellPosition,
  optionalShellString,
} from './feature-shell-access'
import {
  orderedSectionWorkspaceIds,
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
  await requireOrgMember(env.DB, orgId, userId)
  const current = await readWorkspace(env.DB, orgId, workspaceId)
  requireWritableWorkspace(current)
  const nameInput = optionalShellString(context.body?.name)
  const name = nameInput === undefined ? undefined : requiredString(nameInput)
  const sectionInput = optionalShellString(context.body?.sectionId)
  const sectionId = sectionInput ?? current.sectionId
  const position = optionalShellPosition(context.body?.position)
  if (!(await shellSectionExists(env.DB, orgId, sectionId)))
    throw sectionNotFound()
  let order: string[] | undefined
  if (sectionInput !== undefined || position !== undefined) {
    order = await orderedSectionWorkspaceIds(
      env.DB,
      orgId,
      sectionId,
      workspaceId,
    )
    order.splice(Math.min(position ?? 0, order.length), 0, workspaceId)
  }
  const binding = workspaceBinding(env).getByName(workspaceId)
  if (
    !(await updateShellWorkspace(env.DB, {
      orgId,
      userId,
      workspaceId,
      sectionId,
      name,
      order,
      move: sectionInput !== undefined || position !== undefined,
      now: dependencies.now(),
    }))
  ) {
    await requireOrgMember(env.DB, orgId, userId)
    requireWritableWorkspace(await readWorkspace(env.DB, orgId, workspaceId))
    throw sectionNotFound()
  }
  await binding.publishWorkspaceMetadata(orgId, workspaceId)
  const lifecycle = await binding.readLifecycle()
  return Response.json({
    workspace: await workspaceForViewer(
      env,
      userId,
      workspaceView(await readWorkspace(env.DB, orgId, workspaceId)),
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
